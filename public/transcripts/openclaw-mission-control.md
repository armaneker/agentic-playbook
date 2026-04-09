Mission Control is an open-source dashboard designed for managing OpenClaw agents. In this guide, I will walk you through the installation process on an Ubuntu server and how to access it remotely from a MacBook.

Before you begin, ensure you have the following prerequisites: an Ubuntu version of 20.04 or higher, Node.js version 22 or higher, OpenClaw installed and running, and SSH access from your MacBook.

To install Mission Control, start by cloning the repository from GitHub. After cloning, navigate into the Mission Control directory and run the installation script. This script will automatically install Node.js, pnpm, and all necessary dependencies for you.

It's important to note that if your server cannot access Google Fonts, which is often the case in data center environments, the build process may fail. To resolve this, you need to allow access to specific Google Fonts domains in your firewall before proceeding with the build.

Next, you will need to configure the environment variables for Mission Control. Open the `.env` file in the Mission Control directory and fill in the required variables. This includes specifying the OpenClaw gateway host and port, as well as the token for authentication. Make sure to leave the browser-side host variable empty to avoid connection issues.

After setting up the environment variables, you will need to update the OpenClaw configuration file. This involves adding the authentication token and ensuring that the allowed origins for the control UI include the local address for Mission Control. Remember that the authentication token must match in both the environment file and the OpenClaw configuration.

To generate a token, you can use a command that creates a random hexadecimal string. Once generated, do not modify the token manually, as this could disrupt the authentication process. After generating the token, restart the OpenClaw service to apply the changes.

To start the Mission Control service, navigate to the Mission Control directory again and run the start command. 

If your server is located in a data center, you will need to set up an SSH tunnel to access the necessary ports. This involves tunneling both the Mission Control UI port and the OpenClaw WebSocket port through SSH. Once the tunnel is established, you can open the Mission Control interface in your MacBook's browser.

On the first run, you will need to create an admin account by navigating to the setup URL in your browser. 

To register an agent via the API, you will need to set the Mission Control URL and API key as environment variables. Then, you can use a command to send a POST request to register the agent with the specified name and role.

If you want Mission Control to start automatically on server reboot, you will need to create a systemd service file. This file specifies how the service should run and ensures it restarts if it fails. After creating the service file, enable and start the service.

In case you encounter issues, there are a few common troubleshooting steps. If you see a build error related to Google Fonts, ensure that the necessary domains are allowed through your firewall. If the WebSocket connection fails, check that the required tokens are set correctly and that the appropriate ports are tunneled. 

If you experience issues with the terminal editor, you can use an alternative text editor to make necessary changes to the configuration files.

When Mission Control first connects to an OpenClaw gateway, it may require device pairing approval. If tasks remain stuck in the assigned status, this indicates that pairing is needed. To resolve this, find the device ID and approve it. If you encounter a pairing error during the approval process, you can use the request ID instead. 

Once the device is approved, you can create and assign tasks in Mission Control, which should then progress smoothly.

Finally, the architecture of this setup involves your MacBook connecting through an SSH tunnel to the Ubuntu server, where Mission Control and OpenClaw are running on their respective ports. This setup allows for effective management of OpenClaw agents from a remote location.