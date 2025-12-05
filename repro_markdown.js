
function parseMarkdown(text) {
    return text
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br>');
}

const testCases = [
    "Check out https://google.com",
    "Go to http://example.com/page",
    "www.test.com is a site",
    "Link at end: https://site.org",
    "https://site.com in middle",
    "[Markdown Link](https://markdown.com)"
];

console.log("Current Behavior:");
testCases.forEach(text => {
    console.log(`Input: "${text}"`);
    console.log(`Output: "${parseMarkdown(text)}"`);
    console.log("---");
});
