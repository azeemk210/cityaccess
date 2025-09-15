import asyncio, asyncpg

async def main():
    try:
        conn = await asyncpg.connect(
            user="postgres",
            password="postgres",
            database="cityaccess",
            host="127.0.0.1",
            port=5432
        )
        version = await conn.fetchval("SELECT version()")
        print("Connected! PostgreSQL version:", version)
        await conn.close()
    except Exception as e:
        print("Connection failed:", e)

asyncio.run(main())
