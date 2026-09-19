import RubiksRace from '@/components/rubiks/RubiksRace';

export default function RubiksCubeDemoPage() {
  return (
    <>
      <h1>LLM Rubik&apos;s Cube Race</h1>
      <p>
        Four models get the same scrambled 3x3 cube and race to solve it. Each panel shows the model&apos;s moves
        on a live cube with time, token usage and cost.
      </p>
      <RubiksRace />
      <h2>How it works</h2>
      <ul>
        <li>
          Claude Fable 5.1, GPT-6 Astra and Grok 4.6 get the cube as a text net and reply once with a full move
          sequence. Their moves are applied to the cube after the reply arrives.
        </li>
        <li>
          Jev is a TypeSafe decision model, not a text generator. It gets the cube state and 18 candidate turns,
          picks one, and is asked again with the new state until the cube is solved or the step limit is reached.
        </li>
        <li>All four run through OpenRouter. Cost comes from OpenRouter&apos;s usage report for each request.</li>
        <li>
          A model counts as solved only when the moves it produced, applied to the scramble, leave every face a
          single color. Any moves outside U D R L F B notation are ignored.
        </li>
      </ul>
      <h2>Reading the numbers</h2>
      <ul>
        <li>Time is wall-clock from request start to the last token (LLMs) or the last decision (Jev).</li>
        <li>Tokens are input / output as reported by OpenRouter. Reasoning tokens are included in output.</li>
        <li>Scramble depth is the number of random turns applied to a solved cube. Depth 1 to 3 is where text models have a real chance.</li>
      </ul>
    </>
  );
}
