The Steps section is essential for guiding the agent through the skill's instructions. It outlines the specific actions to take, the order in which to execute them, and highlights any important considerations.

Each step is structured in a consistent manner, starting with a numbered action verb. This is followed by sub-items that clarify conditions and exceptions. For example, you might have a step that begins with an action verb and then lists any necessary conditions or exceptions that could affect the action.

To illustrate, consider a practical example. The first step might instruct the agent to parse the user's request. This involves identifying the type of product, such as whether it’s a subscription, one-time purchase, or enterprise solution, and determining the relevant time range. If the request is unclear, the agent should ask for clarification rather than making assumptions.

Next, the agent would fetch the data by executing a specific script with the parameters obtained from the previous step. If an error occurs, the agent should display the error message and suggest checking the user’s credentials. If the data returned is empty, the agent should confirm the time range with the user.

Following that, the agent would calculate and interpret the data. This includes referencing metric definitions from a specific file and computing changes in metrics, flagging any significant changes for attention.

The final step in this example would involve formatting the response. For executive questions, the agent should provide a summary table along with a brief takeaway. For operational questions, a detailed breakdown per customer with sortable columns is required. It’s crucial to always include the data source and timestamp in the response.

When writing these steps, it’s important to start each one with a clear action verb. This ensures that the agent can process the steps in a linear fashion without ambiguity. For instance, instead of saying "User input," you would specify "Collect user input," making it clear what the agent needs to do.

Additionally, it’s vital to mark pause points explicitly. The agent needs clear instructions on when to stop and ask the user for input versus when to continue autonomously. For example, if any field is null during validation, the agent should pause and ask the user if it should proceed without that information.

Referencing specific files within the steps is also important. Instead of directing the agent to a general references folder, you should specify which file to consult for the relevant information. This keeps the instructions precise and actionable.

Each step should be independent, meaning it should assume that the previous step was completed successfully while still providing enough context to be understood on its own.

Below the Steps section, there should be a Guidelines section that outlines rules applicable across all steps. These guidelines serve as constraints and quality standards, ensuring that the procedures remain consistent and reliable.

The Output Format section defines how the results should be presented. This includes specifying the formatting for currency, percentages, dates, and tables. If there are multiple audiences, it’s important to clarify which format applies to each.

Common mistakes to avoid include making steps too vague, failing to include pause points, mixing guidelines into steps, and referencing files that do not exist. Each of these issues can lead to confusion and inefficiency in the agent's performance.