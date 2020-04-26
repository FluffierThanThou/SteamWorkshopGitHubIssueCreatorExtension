const commentContainer = document.getElementsByClassName("commentthread_comments")[0];
const observer = new MutationObserver(createButtons);
observer.observe(commentContainer, { childList: true });

const publishedFileId = document
  .getElementsByClassName("sectionTab")[0]
  .href.match(/(\d+)$/)[1];

function createButtons() {
  const messages = document.getElementsByClassName("commentthread_comment");
  for (const message of messages) {
    const author = message.getElementsByClassName("commentthread_author_link")[0];
    const text = message.getElementsByClassName("commentthread_comment_text")[0];
    const button = document.createElement("a");
    button.addEventListener("click", () =>
      createIssue(author.textContent.trim(), text.innerHTML.trim().replace("<br>", "\n"))
    );
    button.classList.add("actionlink");
    button.setAttribute("data-tooltip-text", "Create Issue");
    button.innerHTML = `<img src="${chrome.runtime.getURL('github-inv.png')}" />`;

    message
      .getElementsByClassName("commentthread_comment_actions")[0]
      .insertAdjacentElement("afterbegin", button);
  }
}

createButtons();

function createIssue(author, text) {
  chrome.storage.sync.get([publishedFileId, "github_api_token", "github_user"], (val) => {
    let repo = val[publishedFileId];
    const owner = val.github_user;
    const token = val.github_api_token;
    let title = text.split("\n")[0];
    const body = `Reported by: ${author}\nDescription:\n${text}`;

    if (!repo) {
      repo = prompt("What is the repository for this mod?").trim();
      chrome.storage.sync.set({ [publishedFileId]: repo }, () => {
        console.log(`Repo for ${publishedFileId} set to ${repo}`);
      });
    }

    title = prompt("Issue title", title);
    if (!title) return;

    fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body, labels: ["steam", "unverified"] }),
      credentials: 'same-origin', // 'include', default: 'omit'
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `token ${token}`
      }),
    }).then(res => { console.log(`Result: ${res.status}`); res.text().then(console.log()) })
      .catch(res => { console.log({ res }); res.text().then(console.log()) })
  });
}
