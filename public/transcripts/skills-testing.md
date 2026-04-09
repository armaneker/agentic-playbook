Testing and iterating on skills is crucial to ensure they function effectively and improve over time. The design principles you start with help you create a solid first draft, but achieving a reliable skill requires a disciplined cycle of testing, measuring, reviewing, and revising.

Building a skill is an iterative process, not a one-time task. You should think of it as a loop that includes drafting, testing, reviewing, measuring, revising, and repeating. Each iteration produces a versioned snapshot of the skill, along with its test results, scores, and human feedback. You continue this cycle until the skill reaches a stable state, where user satisfaction is high, metrics are consistent, and further changes yield diminishing returns.

Every modification should be based on either quantitative evidence, like benchmark scores, or qualitative evidence, such as user feedback on specific outputs. This approach helps avoid common pitfalls, such as altering components that are already functioning well or assuming a change was effective without proper verification.

To maintain organization, structure each iteration as a sibling to the skill directory. This setup allows you to keep a complete audit trail, enabling you to track changes between iterations, user comments, and metric shifts.

A test case consists of a realistic user prompt paired with an expected outcome, designed to mimic actual user interactions rather than abstract examples. Good test cases are specific and reflect the messy nature of real user input. They should also account for edge cases and ambiguities, such as what happens if a user doesn’t specify a time range or if the API returns empty data.

Start with two to three test cases for your initial iteration to keep the feedback loop quick. As the skill stabilizes, you can expand to five to eight test cases to stress-test edge cases. Store these test cases in a designated file, ensuring each one includes a prompt, expected output, and an empty assertions field that you can fill in after reviewing the initial outputs.

A critical aspect of evaluating a skill is determining whether it produces better results than not having the skill at all. For each test case, run two versions: one with the skill enabled and one without, which serves as the baseline. If you're improving an existing skill, the baseline should be the previous version, so make sure to capture that before making any edits. It’s important to run both versions simultaneously to eliminate any potential ordering effects.

Each run should document the output files generated, timing data, and a metadata file linking the run to its test case and assertions. While not everything can be measured objectively, the aspects that can should be. Assertions are specific claims about what the output should contain or how it should behave, and they work best for objectively verifiable properties.

After completing your runs, evaluate each assertion against the actual output. For assertions that can be programmatically checked, consider writing a script to automate this process instead of relying on manual inspection. Once you have graded the individual runs, aggregate the results into a benchmark summary to assess the skill's performance.

When reviewing the outputs, metrics will indicate what is broken, but human reviewers can provide insights into what is wrong. Present each test case alongside its outputs, including the original prompt, the skill's output, previous iteration outputs for comparison, assertion grades, and a feedback textbox. This structured approach allows reviewers to focus on specific areas needing improvement.

When it comes to revising the skill, avoid the temptation to add more rules or constraints. The goal is to create a skill that can handle a wide range of prompts, not just the few you’ve tested. Generalize from feedback, keep prompts concise, explain the reasoning behind rules, and identify repeated work across test cases to streamline the skill.

Be cautious of overfitting, which occurs when your skill becomes too tailored to the specific test cases you've created. Signs of overfitting include rules that reference specific values from your test data or a skill that grows longer without improving. Always prioritize adding more test cases before introducing new rules.

Description optimization is another critical area. This automated process tests and improves the description field in your skill's frontmatter. Create a set of evaluation queries that include both should-trigger and should-not-trigger scenarios. The optimization loop will evaluate the current description, propose improvements, and iterate to find the best description based on test scores.

For rigorous quality assessments between two skill versions, use a blind A/B comparison. This method involves presenting outputs to an independent evaluator without revealing which version produced which output. The evaluator will judge based on predefined quality dimensions, and a separate analysis will determine why one version outperformed the other.

Lastly, keep cost awareness in mind. Every skill has an associated cost, and it’s essential to track metrics like total tokens consumed, duration of responses, and assertion pass rates across iterations. Ideally, you want to see an increase in the assertion pass rate while keeping token usage flat or decreasing. If you notice token usage climbing significantly with only marginal improvements in pass rates, it may be time to reconsider the value of the added instructions.

Once you’re satisfied with the skill based on your initial test cases, expand the test set to include more scenarios. This should encompass edge cases, different user personas, and adjacent domains. Running a full benchmark pass with this expanded set will help reveal any overfitting issues.

In summary, the complete workflow involves drafting the skill, writing initial test cases, running evaluations, grading outputs, collecting human feedback, aggregating benchmarks, revising the skill, optimizing descriptions, and finally expanding the test set for thorough validation. This iterative approach will help ensure your skill is robust, effective, and ready for real-world use.