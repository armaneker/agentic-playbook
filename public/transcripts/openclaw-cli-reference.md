This is a quick reference for common OpenClaw command line interface commands, designed to help you manage various aspects of the tool effectively.

Starting with agent management, you can create a new agent by specifying an identifier. Once the agent is created, you can set its display name to something more recognizable. If you need to see all agents along with their routing bindings, there's a command for that too. Binding an agent to a Slack account is straightforward, and if you need to remove that binding later, you can do so easily.

Next, let's talk about the gateway. You can start the gateway on a specific port, which is essential for communication. If you ever need to restart the gateway process, there's a command for that as well. Additionally, if you want OpenClaw to run as a systemd daemon, you can install it with a specific command.

Moving on to channel and connectivity, you can check the status of all channel connections to ensure everything is functioning correctly. If you're working with Slack, you can list any pending pairing requests and approve them using the appropriate code.

When it comes to updates and security, you can update OpenClaw to the latest version with a simple command. For security, there’s a command that scans for configuration issues, exposed secrets, and permission gaps, helping you maintain a secure environment.

In device management, you can list all paired devices and approve any pending device pairing requests, ensuring that your devices are connected as needed.

For diagnostics, you can run a full health check to ensure everything is operating smoothly.

Now, let’s look at some common workflows. To set up a new agent from scratch, you would first create the agent, then set its display name. After that, you would bind it to a channel, restart the gateway, and finally verify that everything is working by checking the agent's bindings and channel status.

If you encounter a non-responsive agent, the first step is to check that the gateway is running. After that, you would check the channel connectivity and verify the agent's bindings. For Slack, you can also check the pairing status to ensure everything is in order.

Lastly, if you need to approve a new Slack user, you would start by listing any pending pairings and then approve the specific pairing code for the account in question.

This overview should give you a solid understanding of how to use the OpenClaw CLI effectively.