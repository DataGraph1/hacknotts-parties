# TODO:
# - enable / disable point enteries
# - end point to access islands
# - auto create islands on point threshholds
# - auto setup (decide how much, probs just loading island dicts from database)
# - maybe some pretty refactoring?
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
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


# if you decide to change this RUN THE `/reset_table` END POINT!!! otherwise the database wont match with the code
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
growable_islands: Dict[str, list[Pos]] = {}
used_islands: Dict[Pos, bool] = {}


@app.get("/ping")
async def ping():
    return "pong"

@app.get("/health")
async def health():
    return {"status": "ok"}


# this could have a better name cause it also resets itself + the islands Dictionary's,
# but i want to keep db & dictionary changes together to ensure they dont desync
async def db_setup():
    pool = await get_pool()

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
        growable_islands.clear()
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
    try:
        await add_point_entry(name, value)
    except asyncpg.exceptions.InvalidTextRepresentationError as e:
        return f"ERROR: name '{name}' is not a valid name within {TEAM_NAMES}"

    return "SUCCESS"

async def add_point_entry(team_name: str, amount: int):
    pool = await get_pool()

    async with pool.acquire() as conn:
        await conn.execute(
            f"""
            INSERT INTO team_points (team_name, amount)
            VALUES ('{team_name}', {amount});
            """
        )


@app.get("/get_sum_points")
async def get_points_endpoint(name: str):
    pool = await get_pool()

    async with pool.acquire() as conn:
        try:
            amount = await conn.fetch(f"SELECT SUM(amount) FROM team_points WHERE team_name='{name}';")
        except asyncpg.exceptions.InvalidTextRepresentationError as e:
            return f"ERROR: name '{name}' is not a valid name within {TEAM_NAMES}"

    return amount[0][0]


@app.get("/generate_island")
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

    pool = await get_pool()

    if not pos in used_islands:
        return f"ERROR: pos {pos} is empty"

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
            print(type(e))
            print(e)

async def islands_setup():
    starting_x_pos : int = -len(TEAM_NAMES)

    for i, v in enumerate(TEAM_NAMES):
        await add_island((starting_x_pos+2*i, 0), v)


# TODO: Have this like autoload or something & 
# make the internal island dictionaries load from db if it has data
@app.get("/setup")
async def setup():
    await db_setup()

    for name in TEAM_NAMES:
        growable_islands[name] = []

    await islands_setup()

    return "SUCCESS"