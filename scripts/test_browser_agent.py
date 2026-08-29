from browser_use import Agent
import asyncio

async def main():
    agent = Agent(task="Go to https://example.com and report the page title")
    result = await agent.run()
    print("Result:", result)

if __name__ == "__main__":
    asyncio.run(main())
