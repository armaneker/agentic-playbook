The scripts directory is where you'll find executable code, such as Python, Node.js, and shell scripts, that your skill runs during specific steps. These scripts are essential for operations that require precision, including API calls, calculations, data parsing, and validation.

You should use a script when you need an exact answer, such as for financial calculations or scoring algorithms. They are also necessary when external data is required, like making API calls or querying a database. If the transformation of data is complex, for instance, parsing Excel files or normalizing data schemas, a script is the right tool. Additionally, when validation rules are strict, such as regex checks or threshold comparisons, scripts are appropriate.

It's important to let the agent handle tasks that involve natural language, like explanations, interpretations, summarizations, and formatting the final response.

In terms of directory structure, within your skill's main folder, you'll have a SKILL.md file, a references folder, and a scripts folder. The scripts folder will contain files like fetch-report.py, which pulls data from an API, calculate-metrics.py, which computes derived values, and validate-input.py, which checks data quality.

When referencing scripts in your SKILL.md Steps section, you would describe the action, such as fetching data, and specify which script to run along with the required parameters. If the script encounters an issue and returns a non-zero value, you should ensure that the user is informed of the error.

When writing scripts, it's crucial to accept parameters and return structured output. This means using formats like JSON for the output so that the agent can reliably parse it. Additionally, you should provide clear error messages that indicate what went wrong, such as missing environment variables or failed API calls. It's also important to return a non-zero exit code on failure to signal to the agent that something went wrong.

Another key point is to keep your scripts focused. Each script should have a single responsibility. Avoid creating a single script that tries to do everything. Instead, break down tasks into individual scripts, each handling a specific job.

It's also essential to understand the difference between scripts and references. The references directory contains static text and documentation, which is read into context and rarely changes. In contrast, the scripts directory holds executable code that is run to produce output, which varies based on input.

Common mistakes to avoid include hardcoding credentials; always use environment variables instead. Ensure you implement error handling so that if an API is down, the script communicates that clearly rather than failing silently. Avoid printing unstructured text, as the agent needs to parse the output. Instead, stick to JSON or a consistent format. Lastly, if a script has side effects, such as writing data or triggering a deployment, make sure to include a confirmation step in the skill's Steps before executing it.