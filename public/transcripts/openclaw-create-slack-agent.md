This guide explains how to create a new specialized OpenClaw agent and connect it to Slack as an independent bot. The process is similar for any new agent, with the primary difference being the names you choose.

Before you start, ensure you have OpenClaw installed and running on your server, an existing main agent connected to Slack, admin access to your Slack workspace, and terminal or SSH access to your OpenClaw server.

To create the agent in OpenClaw, begin by running the agent creation wizard. You'll be prompted through several options. When asked if you want to copy authentication profiles from the main agent, select yes. This action will duplicate your existing API keys and OAuth tokens, allowing the new agent to connect to your LLM provider right away. Importantly, this copy is independent, meaning changes to tokens on one agent won’t affect the other.

Next, you’ll configure the model. When prompted, select yes to configure the model and authentication for this agent. Enter your preferred model; for a conversational agent, a model like `anthropic/claude-sonnet-4-6` is a good choice, balancing quality and cost. Reserve more complex models for agents requiring deep reasoning.

Following that, set the agent's identity by specifying its name. Afterward, verify the creation of your agent by listing all agents and their bindings. You should see your new agent alongside existing ones, each with its own workspace and directory.

Now, let’s create a Slack bot for your new agent. Each OpenClaw agent gets its own Slack bot, allowing your team to interact with different bots for various tasks. Start by creating a new Slack app on the Slack API website. Click to create a new app from scratch, name it appropriately, and select your workspace. If you have an existing manifest from another bot, you can use that to save time on scope and event configuration.

Once the app is created, enable Socket Mode by clicking on it in the sidebar, toggling it on, and generating a token and scopes. Name the token `openclaw-socket` and add the `connections:write` scope. After generating, copy the App-Level Token, which starts with `xapp-`.

Next, configure the bot token scopes by navigating to the OAuth and Permissions section. Here, you’ll add several scopes that will allow your bot to send messages, read channel messages, discover channels, and more. These scopes are essential for the bot to function correctly within Slack.

Then, subscribe to bot events by toggling on event subscriptions and adding various events like app mentions and message events. This ensures your bot can respond to interactions appropriately. After that, enable the App Home and make sure to turn on the Messages Tab, which is necessary for direct messages to work.

Once everything is set, install the app to your workspace. After authorizing, copy the Bot User OAuth Token, which starts with `xoxb-`. At this point, you should have both the App-Level Token and the Bot Token.

Next, you need to connect the bot to OpenClaw. First, ensure your Slack configuration supports multiple accounts. Update your configuration file to reflect a multi-account setup, where you’ll specify the tokens for both the main agent and the new sales agent.

After updating the configuration, create the routing binding for your new agent. If your main agent doesn’t have an explicit Slack binding yet, you’ll need to add one as well. Once that’s done, restart the OpenClaw gateway and verify the status of the channels and the agents.

When someone sends the first direct message to the new bot in Slack, OpenClaw will generate a pairing code that requires approval. You can check for any pending requests and approve the pairing code for the sales account. After approval, send another message to the bot to confirm it responds correctly.

Now that the agent is running, you’ll want to customize its personality and domain knowledge by editing its workspace files. In the SOUL.md file, define the agent's persona, tone, and boundaries. This includes outlining its expertise and the limits of its knowledge. In the AGENTS.md file, specify how the agent operates, including its memory behavior and workflow instructions. The USER.md file should detail who will interact with the agent, and the TOOLS.md file can reference any custom skills or API endpoints the agent can utilize.

Finally, you can verify that everything is set up correctly by checking the list of agents and their bindings, ensuring both Slack accounts are connected, and confirming that the new bot responds to direct messages and mentions in channels. If you encounter any issues, there are troubleshooting steps available for common problems, such as ensuring the bot responds in channels, checking pairing status, or verifying that the correct tokens are being used.

By following these steps, you’ll successfully create and configure a new OpenClaw agent connected to Slack, ready to assist your team.