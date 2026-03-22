export default function Footer() {
  return (
    <footer className="border-t border-gray-800 px-6 py-6 lg:px-10">
      <p className="text-sm text-gray-500">
        Built by Arman Eker{' '}
        <span className="text-gray-700 mx-1">&middot;</span>
        <a
          href="https://github.com/armaneker/agentic-playbook"
          className="text-gray-400 hover:text-gray-200 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span className="text-gray-700 mx-1">&middot;</span>
        <a
          href="https://x.com/araborz"
          className="text-gray-400 hover:text-gray-200 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          X (@araborz)
        </a>
      </p>
    </footer>
  );
}
