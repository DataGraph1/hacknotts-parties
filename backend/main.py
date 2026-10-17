# TODO:
# - maybe some refactoring?
# - access control (viewing for all, adding & changing "exists" for admins, full access only to this script)

from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Dict, AsyncIterator, Protocol
from pydantic import BaseModel
import asyncpg, asyncio, random, json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .database import (
    connect_db,
    disconnect_db,
    get_pool,
    settings,
)


# if you decide to change this RUN THE `/restart` END POINT!!! otherwise the database wont match with the code
# TODO: add this to a config or smthing and have it loaded at runtime
TEAM_NAMES : list[str] = [
    "Xbox",
    "PS2",
]

# not constant cause it gets shuffled for random selection
island_connecting_offsets: list[Pos] = [
    (-1, 0), (0, -1), (1, 0), (0, 1)
]
type Pos = tuple[int, int]



@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()

    pool = await get_pool()

    listener_conn = await pool.acquire()

    try:
        await start_listener(listener_conn) # i have NO IDEA what these errors mean but it works so lets ignore them
        app.state.listener_conn = listener_conn

        yield

    finally:
        await stop_listener(listener_conn)
        await pool.release(listener_conn)
        await disconnect_db()


app = FastAPI(
    title="PostgreSQL API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    print("ping!")
    return {"status": "ok"}

async def clear_db():
    pool = await get_pool()
    
    async with pool.acquire() as conn:
        await conn.execute(
            """
            TRUNCATE team_points, islands;
            """
        )

        for name in TEAM_NAMES:
            await conn.execute(
                f"""
                ALTER TYPE team_names ADD VALUE IF NOT EXISTS '{name}';
                """
            )

    return "SUCCESS"


# this current causes errors so lets not use it
# this should be used to create the db if not already existing
async def db_setup():
    # These first 2 lines cause cache to be cleared, otherwise it causes problems 
    # when we drop the tables
    print("Started db", flush=True)
    await disconnect_db()
    await connect_db()
    pool = await get_pool()
    print("Reset pool", flush=True)

    # TODO: Assuming theres a better way to just clear the table and reset SERIAL instead of 
    # dropping and recreating them each time?
    async with pool.acquire() as conn:
        print("Dropping", flush=True)
        await conn.execute(
            """
            DROP TABLE IF EXISTS team_points
            """
        )
        await conn.execute(
            """
            DROP TABLE IF EXISTS islands
            """
        )

        await conn.execute(
            """
            DROP TYPE IF EXISTS team_names
            """
        )

        print("Creating", flush=True)
        await conn.execute(team_names_enum_setup(TEAM_NAMES))
        await conn.execute(
            """
            CREATE TABLE team_points (
                id SERIAL PRIMARY KEY NOT NULL,
                team_name team_names NOT NULL,
                amount INT NOT NULL,
                exists bool NOT NULL DEFAULT True
            );
            """
        )
        await conn.execute(
            """
            CREATE TABLE islands (
                x INT NOT NULL,
                y INT NOT NULL,
                team_name team_names NOT NULL,
                growable bool,
                PRIMARY KEY(x, y)
            );
            """
        )
        print("Commands", flush=True)
        await conn.execute(
            """
            CREATE OR REPLACE FUNCTION notify_new_island()
                RETURNS trigger AS $$
            BEGIN
                PERFORM pg_notify('new_island', row_to_json(NEW)::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER new_island_trigger
                AFTER INSERT ON islands
                FOR EACH ROW
            EXECUTE FUNCTION notify_new_island();
            """
        )
        # await conn.execute(
        #     """
        #     CREATE OR REPLACE FUNCTION notify_clear_islands()
            #     RETURNS trigger AS $$
            # BEGIN
            #     PERFORM pg_notify('clear_islands', '');
            #     RETURN NEW;
            # END;
            # $$ LANGUAGE plpgsql;

            # CREATE TRIGGER clear_islands_trigger
            #     AFTER TRUNCATE ON islands
            # EXECUTE FUNCTION notify_clear_islands();
        #     """
        # )

        # await conn.execute(
        #     """
            # CREATE OR REPLACE FUNCTION notify_point_update()
            #     RETURNS trigger AS $$
            # BEGIN
            #     PERFORM pg_notify('point_update', '');
            #     RETURN NEW;
            # END;
            # $$ LANGUAGE plpgsql;


            # CREATE TRIGGER point_insert_trigger
            #     AFTER INSERT ON team_points
            # EXECUTE FUNCTION notify_point_update();

            # CREATE TRIGGER point_update_trigger
            #     AFTER UPDATE ON team_points
            # EXECUTE FUNCTION notify_point_update();

            # CREATE TRIGGER point_truncate_trigger
            #     AFTER TRUNCATE ON team_points
            # EXECUTE FUNCTION notify_point_update();
        #     """
        # )



    print("Done", flush=True)

    return "SUCCESS"

def team_names_enum_setup(team_names: list[str]) -> str:
    output = "CREATE TYPE team_names AS ENUM ("

    for val, name in enumerate(team_names):
        output += f"'{name}'"
        if val < len(team_names)-1:
            output += ", "

    output += ");"
    return output


@app.get("/add_points")
async def add_points_endpoint(name: str, value: int):
    LOW_VALUE = 1
    HIGH_VALUE = 100

    if value < LOW_VALUE or value > HIGH_VALUE:
        return f"ERROR: value {value} is out of range {LOW_VALUE} to {HIGH_VALUE}"
    try:
        await add_points(name, value)
    except asyncpg.exceptions.InvalidTextRepresentationError as e:
        return f"ERROR: name '{name}' is not a valid name within {TEAM_NAMES}"

    return "SUCCESS"

async def add_points(team_name: str, amount: int):
    for _ in range(amount):
        await generate_island(team_name)

    pool = await get_pool()

    async with pool.acquire() as conn:
        await conn.execute(
            f"""
            INSERT INTO team_points (team_name, amount)
            VALUES ('{team_name}', {amount});
            """
        )

@app.get("/entry_exists_status")
async def set_point_exists_status(entry_id: int, exists: bool):
    pool = await get_pool()

    async with pool.acquire() as conn:
        if not (await conn.fetch(
            f"""
            SELECT EXISTS
            (SELECT 1 FROM team_points WHERE id = {entry_id})
            """
        ))[0][0]:
            return f"ERROR: Entry with ID {entry_id} doesn't exist"

        await conn.fetch(
            f"""
            UPDATE team_points
            SET exists = {exists}
            WHERE id = {entry_id}
            """
        )

        return "SUCCESS"


@app.get("/get_sum_points")
async def get_points() -> Dict[str, int]:
    points: Dict[str, int] = {name: 0 for name in TEAM_NAMES}
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT team_name, SUM(amount)
            FROM team_points
            GROUP BY team_name
            """
        )
        
        for row in rows:
            if row["sum"] == None:
                points[row["team_name"]] = 0
            else:
                points[row["team_name"]] = row["sum"]

    return points


@app.get("/get_islands")
async def get_islands() -> Dict[str, list[Pos]]:
    islands: Dict[str, list[Pos]] = {name: [] for name in TEAM_NAMES}
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT team_name, x, y
            FROM islands
            WHERE team_name = ANY($1)
            """, TEAM_NAMES
        )

        for row in rows:
            islands[row["team_name"]].append((row["x"], row["y"]))

    return islands

async def get_growable_islands() -> Dict[str, list[Pos]]:
    islands: Dict[str, list[Pos]] = {name: [] for name in TEAM_NAMES}
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT team_name, x, y
            FROM islands
            WHERE team_name = ANY($1) and growable = true
            """, TEAM_NAMES
        )

        for row in rows:
            islands[row["team_name"]].append((row["x"], row["y"]))

    return islands

async def get_used_island_pos() -> Dict[Pos, bool]: 
    used_pos: Dict[Pos, bool] = {}

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT x, y
            FROM islands
            WHERE team_name = ANY($1)
            """, TEAM_NAMES
        )

        for row in rows:
            used_pos[(row["x"], row["y"])] = True

    return used_pos


async def generate_island(team_name: str):
    growing_from_pos = random.choice((await get_growable_islands())[team_name])
    random.shuffle(island_connecting_offsets)

    for offset in island_connecting_offsets:
        test_pos: Pos = (growing_from_pos[0] + offset[0],
                         growing_from_pos[1] + offset[1])
        if not test_pos in (await get_used_island_pos()):
            break

    await add_island(test_pos, team_name)
    return f"SUCCESS: added team '{team_name}' island to pos {test_pos}"

async def add_island(pos: Pos, team_name: str):
    await save_island_to_db(pos, team_name)
    await set_island_growablity(pos, team_name, (await check_island_growable(pos)))

    for offset in island_connecting_offsets:
        check_pos: Pos = (pos[0] + offset[0],
                          pos[1] + offset[1])
        if check_pos in (await get_used_island_pos()):
            await set_island_growablity(check_pos, team_name, (await check_island_growable(check_pos)));

async def check_island_growable(pos: Pos) -> bool:
    for offset in island_connecting_offsets:
        check_pos: Pos = (pos[0] + offset[0],
                          pos[1] + offset[1])

        if not check_pos in (await get_used_island_pos()):
            return True

    return False

async def save_island_to_db(pos: Pos, team_name: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            await conn.fetch(
                f"""
                INSERT INTO islands (x, y, team_name)
                VALUES ({pos[0]}, {pos[1]}, '{team_name}');
                """
            )
        except asyncpg.exceptions.UniqueViolationError as e:
            return f"ERROR: pos {pos} is already taken up"
        except asyncpg.exceptions.InvalidTextRepresentationError as e:
            return f"ERROR: name '{team_name}' is not a valid name within {TEAM_NAMES}"

async def set_island_growablity(pos: Pos, team_name: str, growable: bool):
    if not pos in (await get_used_island_pos()):
        return f"ERROR: pos {pos} is empty"

    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            await conn.fetch(
                f"""
                UPDATE islands
                SET growable = {growable}
                WHERE x = {pos[0]} AND y = {pos[1]}
                """
            )
        except Exception as e:
            return e

    return "SUCCESS"

async def islands_setup():
    starting_x_pos : int = -len(TEAM_NAMES)

    for i, v in enumerate(TEAM_NAMES):
        await add_island((starting_x_pos+2*i, 0), v)



@app.get("/restart")
async def restart():
    await clear_db()
    await islands_setup()
    
    return {"status": "SUCCESS"}



def on_new_island(
    conn: asyncpg.Connection,
    pid: int,
    channel: str,
    payload: str,
):
    asyncio.create_task(handle_new_island(payload))
async def handle_new_island(payload: str):
    island = json.loads(payload)

    print("-> new islands")

    await webhook_announcement(
        event = "island.new",
        data = {
            "x": island["x"],
            "y": island["y"],
            "team": island["team_name"]
        }
    )

def on_clear_islands(
    conn: asyncpg.Connection,
    pid: int,
    channel: str,
    payload: str,
):
    asyncio.create_task(handle_clear_islands())
async def handle_clear_islands():
    print("-> clear islands")

    await webhook_announcement(
        event = "island.clear",
        data = {}
    )

def on_point_update(
    conn: asyncpg.Connection,
    pid: int,
    channel: str,
    payload: str,
):
    asyncio.create_task(handle_point_update())
async def handle_point_update():
    print("-> point update")

    data = await get_points()

    await webhook_announcement(
        event = "point.change",
        data = data
    )


class ListenerConnection(Protocol):
    async def add_listener(
        self,
        channel: str,
        callback: Callable,
    ) -> object: ...

    async def remove_listener(
        self,
        channel: str,
        callback: Callable,
    ) -> object: ...

async def start_listener(conn: ListenerConnection):
    await conn.add_listener("clear_islands", on_clear_islands)
    await conn.add_listener("new_island", on_new_island)
    await conn.add_listener("point_update", on_point_update)


async def stop_listener(conn: ListenerConnection):
    await conn.remove_listener("new_island", on_new_island)
    await conn.remove_listener("clear_islands", on_clear_islands)
    await conn.add_listener("point_update", on_point_update)



# ai generated
listeners: set[asyncio.Queue] = set()

@app.get("/events")
async def webhook_listen(request: Request):
    queue: asyncio.Queue = asyncio.Queue()
    listeners.add(queue)

    async def event_stream() -> AsyncIterator[str]:
        try:
            # Tell the frontend that its listener is registered.
            yield 'event: connected\ndata: {"status": "connected"}\n\n'

            while True:
                if await request.is_disconnected():
                    break

                try:
                    event = await asyncio.wait_for(
                        queue.get(), timeout=15
                    )
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Keep the SSE connection alive.
                    yield ": keep-alive\n\n"
        finally:
            listeners.discard(queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

async def webhook_announcement(event: str, data: dict):
    item = {
        "event": event,
        "data": data
    }

    for queue in list(listeners):
        print("Sending data to: ", queue)
        queue.put_nowait(item)

    return {
        "status": "sent",
        "listeners": len(listeners),
        "event": event,
    }

@app.get("/listeners")
async def get_listeners():
    return {"listeners": len(listeners)}