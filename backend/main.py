# TODO:
# - maybe some refactoring?
# - access control (viewing for all, adding & changing "exists" for admins, full access only to this script)

from contextlib import asynccontextmanager
from typing import Dict
import asyncpg, random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
# TODO: I assume these should be removed and just queried from database whenever there needed
# to simply code and prevent db & lists holding different data
growable_islands: Dict[str, list[Pos]] = {name: [] for name in TEAM_NAMES}
used_islands: Dict[Pos, bool] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await setup()

    yield

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
    return {"status": "ok"}


# this could have a better name cause it also resets itself + the islands Dictionary's,
# but i want to keep db & dictionary changes together to ensure they dont desync
async def db_setup():
    global growable_islands
    global used_islands
    
    
    # These first 2 lines cause cache to be cleared, otherwise it causes problems 
    # when we drop the tables
    await disconnect_db()
    await connect_db()
    pool = await get_pool()

    # TODO: Assuming theres a better way to just clear the table and reset SERIAL instead of 
    # dropping and recreating them each time?
    async with pool.acquire() as conn:
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
        growable_islands = {name: [] for name in TEAM_NAMES}
        used_islands.clear()

        await conn.execute(
            """
            DROP TYPE IF EXISTS team_names
            """
        )

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
        # growable not set to NOT NULL, as instead of being assigned at first creation,
        # we change it in set_island_growablity to ensure db & growable_islands Dict stay in sync
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
async def get_points_endpoint(name: str):
    pool = await get_pool()

    async with pool.acquire() as conn:
        try:
            amount = await conn.fetch(f"SELECT SUM(amount) FROM team_points WHERE team_name='{name}';")
        except asyncpg.exceptions.InvalidTextRepresentationError as e:
            return f"ERROR: name '{name}' is not a valid name within {TEAM_NAMES}"

    return amount[0][0]


async def generate_island(team_name: str):
    growing_from_pos = random.choice(growable_islands[team_name])
    random.shuffle(island_connecting_offsets)

    for offset in island_connecting_offsets:
        test_pos: Pos = (growing_from_pos[0] + offset[0],
                         growing_from_pos[1] + offset[1])
        if not test_pos in used_islands:
            break

    await add_island(test_pos, team_name)
    return f"SUCCESS: added team '{team_name}' island to pos {test_pos}"

async def add_island(pos: Pos, team_name: str):
    print("GROWABLE NOW: ", growable_islands)

    used_islands[pos] = True
    await save_island_to_db(pos, team_name)
    await set_island_growablity(pos, team_name, check_island_growable(pos))

    for offset in island_connecting_offsets:
        check_pos: Pos = (pos[0] + offset[0],
                          pos[1] + offset[1])
        if check_pos in used_islands:
            await set_island_growablity(check_pos, team_name, check_island_growable(check_pos));

def check_island_growable(pos: Pos) -> bool:
    for offset in island_connecting_offsets:
        check_pos: Pos = (pos[0] + offset[0],
                          pos[1] + offset[1])

        if not check_pos in used_islands:
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
    growable_islands[team_name].append(pos)

    if not pos in used_islands:
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


async def load_island_data_from_db():
    global growable_islands
    growable_islands = {name: [] for name in TEAM_NAMES}
    global used_islands
    used_islands = {}
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT x, y, team_name, growable
            FROM islands
            """
        )

        print(rows)

        for row in rows:
            if row["growable"]:
                growable_islands[row["team_name"]].append((row["x"], row["y"]))
            used_islands[(row["x"], row["y"])] = True


@app.get("/setup")
async def setup():
    await load_island_data_from_db()
    return "SUCCESS"

@app.get("/restart")
async def restart():
    await db_setup()
    await islands_setup()