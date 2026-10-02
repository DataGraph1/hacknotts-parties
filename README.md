# HACKNOTTS PARTIES

### Development
(TODO: Make development instructions clearer)
- Download and setup docker: https://docs.docker.com/desktop/
- git clone this repo: `git clone https://github.com/DataGraph1/hacknotts-parties.git`
- Make a copy of `.env.example` just called `.env` and fill in the postgres username and password (these can be whatever)
- Go into your cloned repo directory in a terminal
- Run `docker compose up --watch`

##### Extra info:
- Changes to backend should auto update, haven't tested frontend yet
- If frontend doesn't update or you make changes to docker files, run `docker compose up --watch --build`
- Use `docker compose down` to stop everything

### Todo:
- Backend stuff (at top of `backend/main.py`)
- Making frontend call backend
- Database permissions
- Frontend admin panel just generally
- Making frontend look nice