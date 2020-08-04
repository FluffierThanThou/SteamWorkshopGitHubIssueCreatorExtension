// Set up comment watching, workshop paging uses ajax to populate posts, we need to react.
const commentContainer = document.getElementsByClassName(
  "commentthread_comments"
)[0];
const observer = new MutationObserver(createButtons);
observer.observe(commentContainer, { childList: true });

// Fetch id for mod
const publishedFileId = document
  .getElementsByClassName("sectionTab")[0]
  .href.match(/(\d+)$/)[1];

// create button on each comment
function createButtons() {
  const messages = document.getElementsByClassName("commentthread_comment");
  for (const message of messages) {
    const author = message.getElementsByClassName(
      "commentthread_author_link"
    )[0];
    const text = message.getElementsByClassName(
      "commentthread_comment_text"
    )[0];
    const button = document.createElement("a");
    button.addEventListener("click", () =>
      createIssue(
        author.textContent.trim(),
        text.innerHTML.trim().replace("<br>", "\n")
      )
    );
    button.classList.add("actionlink");
    button.setAttribute("data-tooltip-text", "Create Issue");
    button.innerHTML = `<img src="${chrome.runtime.getURL(
      "github-inv.png"
    )}" />`;

    message
      .getElementsByClassName("commentthread_comment_actions")[0]
      .insertAdjacentElement("afterbegin", button);
  }
}
createButtons();

function toast(type, text, link = undefined) {
  let color;
  switch (type) {
    case "success":
      color = "hsl(141, 53%,  53%)";
      break;
    case "error":
      color = "hsl(348, 86%, 61%)";
      break;
    default:
      color = "hsl(217, 71%,  53%)";
      break;
  }
  Toastify({
    text: text,
    duration: 3000,
    destination: link,
    newWindow: true,
    close: true,
    gravity: "bottom", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    backgroundColor: color,
    stopOnFocus: true, // Prevents dismissing of toast on hover
  }).showToast();
}

function createIssue(author, text) {
  chrome.storage.sync.get(
    [publishedFileId, "github_api_token", "github_user"],
    (val) => {
      let repo = val[publishedFileId];
      const owner = val.github_user;
      const token = val.github_api_token;
      let title = text.split("\n")[0];
      const body = `Reported by: ${author}\nDescription:\n${text}`;

      if (!repo) {
        repo = prompt("What is the repository for this mod?").trim();
        chrome.storage.sync.set({ [publishedFileId]: repo }, () => {
          toast("info", `Repo for ${publishedFileId} set to ${repo}`);
        });
      }

      title = prompt("Issue title", title);
      if (!title) return;

      fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: "POST",
        body: JSON.stringify({ title, body, labels: ["steam", "unverified"] }),
        credentials: "same-origin", // 'include', default: 'omit'
        headers: new Headers({
          "Content-Type": "application/json",
          Authorization: `token ${token}`,
        }),
      })
        .then(async (res) => {
          let body = await res.json();
          console.log({ res, body });
          if (res.ok) {
            toast("success", `issue created (#${body.number})`, body.html_url);
          } else {
            toast("error", `Error: ${res.statusText}`);
          }
        })
        .catch((err) => {
          console.log({ err });
          toast("error", `Error: ${err}`);
        });
    }
  );
}

const MAX_CHARACTERS = 1000;

/**
 *
 * @param {HTMLElement} entrybox
 */
function addCharacterCounter(entrybox) {
  let textarea = entrybox.getElementsByTagName("textarea")[0];
  let countText = document.createElement("div");
  countText.classList.add("count-text");
  entrybox.appendChild(countText);

  function updateCount() {
    let count = textarea.value.length;
    if (count > MAX_CHARACTERS) {
      countText.innerText = `${count - MAX_CHARACTERS} characters over.`;
      countText.classList.toggle("count-over", true);
    } else {
      countText.innerText = `${MAX_CHARACTERS - count} characters remaining.`;
      countText.classList.toggle("count-over", false);
    }
  }

  updateCount();
  textarea.onchange = updateCount;
  textarea.oninput = updateCount;
}

for (const entrybox of document.getElementsByClassName(
  "commentthread_entry_quotebox"
)) {
  addCharacterCounter(entrybox);
}
