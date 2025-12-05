
function parseMarkdown(text) {
  // Original replacements
  let html = text
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');

  // New URL replacement
  // Regex explanation:
  // https?:\/\/  -> http:// or https://
  // [^\s<]+      -> one or more non-whitespace, non-< characters
  // [^<.,:;"')\]\s] -> ensure the last character isn't punctuation often found at end of sentences
  html = html.replace(/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="task-link">$1</a>');

  return html;
}

const testCases = [
  { input: "Check out https://google.com", expected: 'Check out <a href="https://google.com" target="_blank" rel="noopener noreferrer" class="task-link">https://google.com</a>' },
  { input: "Go to http://example.com/page", expected: 'Go to <a href="http://example.com/page" target="_blank" rel="noopener noreferrer" class="task-link">http://example.com/page</a>' },
  { input: "Link at end: https://site.org.", expected: 'Link at end: <a href="https://site.org" target="_blank" rel="noopener noreferrer" class="task-link">https://site.org</a>.' },
  { input: "(https://wrapped.com)", expected: '(<a href="https://wrapped.com" target="_blank" rel="noopener noreferrer" class="task-link">https://wrapped.com</a>)' },
  { input: "https://site.com/path?q=1", expected: '<a href="https://site.com/path?q=1" target="_blank" rel="noopener noreferrer" class="task-link">https://site.com/path?q=1</a>' },
  { input: "No link here", expected: "No link here" }
];

console.log("Verifying Regex Logic:");
let passed = 0;
testCases.forEach((test, index) => {
  const result = parseMarkdown(test.input);
  if (result === test.expected) {
    console.log(`Test ${index + 1}: PASS`);
    passed++;
  } else {
    console.log(`Test ${index + 1}: FAIL`);
    console.log(`  Input:    "${test.input}"`);
    console.log(`  Expected: "${test.expected}"`);
    console.log(`  Actual:   "${result}"`);
  }
});

console.log(`\n${passed}/${testCases.length} tests passed.`);
