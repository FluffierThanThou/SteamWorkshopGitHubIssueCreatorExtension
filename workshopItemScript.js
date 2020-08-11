// Set up comment watching, workshop paging uses ajax to populate posts, we need to react.
const commentContainer = document.getElementsByClassName(
  "commentthread_comments"
)[0];
const observer = new MutationObserver(createButtons);
observer.observe(commentContainer, { childList: true });

const DEFAULT_TEXTAREA = document
  .getElementsByClassName("commentthread_entry_quotebox")[0]
  .getElementsByTagName("textarea")[0];

const MOD_ID = document
  .getElementsByClassName("sectionTab")[0]
  .href.match(/(\d+)$/)[1];

const MAX_CHARACTERS = 1000;

// create buttons on each comment
function createButtons() {
  const messages = document.getElementsByClassName("commentthread_comment");
  for (const message of messages) {
    const author = message.getElementsByClassName(
      "commentthread_author_link"
    )[0];
    const text = message.getElementsByClassName(
      "commentthread_comment_text"
    )[0];

    const actions = message.getElementsByClassName(
      "commentthread_comment_actions"
    )[0];
    actions.insertAdjacentElement(
      "afterbegin",
      createIssueButton(author, text)
    );
    actions.insertAdjacentElement("afterbegin", createReplyButton(author));
  }

  // re-create steam tooltips
  bindTooltips();
}
createButtons();

function bindTooltips() {
  // we cannot execute page scripts directly, but we can insert a script element that does it for us.
  // if it's this easy to circumvent, what is the point of sandboxing other than annoying devs?
  const scriptNode = document.createElement("script");
  const scriptBody = document.createTextNode(
    "BindTooltips(document, { tooltipCSSClass: 'community_tooltip' });"
  );
  scriptNode.appendChild(scriptBody);
  document.body.append(scriptNode);

  // clean up after ourselves
  setTimeout(() => {
    scriptNode.remove();
  }, 1000);
}

function createIssueButton(author, text) {
  const button = document.createElement("a");
  button.addEventListener("click", () =>
    createIssue(
      author.textContent.trim(),
      text.innerHTML.trim().replace("<br>", "\n")
    )
  );
  button.classList.add("actionlink");
  button.setAttribute("data-tooltip-text", "Create Issue");
  button.innerHTML = `<img src="${chrome.runtime.getURL("github-inv.png")}" />`;
  return button;
}

function createReplyButton(author) {
  const button = document.createElement("a");
  button.addEventListener("click", () => reply(author.textContent.trim()));
  button.classList.add("actionlink");
  button.setAttribute("data-tooltip-text", "Reply");
  button.innerHTML = `<img src="${chrome.runtime.getURL("reply.png")}" />`;
  return button;
}

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
    [MOD_ID, "github_api_token", "github_user"],
    (val) => {
      let repo = val[MOD_ID];
      const owner = val.github_user;
      const token = val.github_api_token;
      let title = text.split("\n")[0];
      const body = `Reported by: ${author}\nDescription:\n${text}`;

      if (!repo) {
        repo = prompt("What is the repository for this mod?").trim();
        chrome.storage.sync.set({ [MOD_ID]: repo }, () => {
          toast("info", `Repo for ${MOD_ID} set to ${repo}`);
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
            reply(author, `  [url=${body.html_url}]here[/url]`);
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

/**
 *
 * @param {string} user
 * @param {string} text
 * @param {HTMLTextAreaElement} textarea
 */
function reply(user, text = "", textarea = DEFAULT_TEXTAREA) {
  if (textarea.value && !textarea.value.endsWith("\n")) textarea.value += "\n";
  textarea.value += `[b]@${user}:[/b] ${text}`;
  textarea.focus();
}

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
  textarea.addEventListener("change", updateCount, false);
  textarea.addEventListener("input", updateCount, false);
  textarea.addEventListener("focus", updateCount, false);
  textarea.addEventListener("blur", updateCount, false);
}

for (const entrybox of document.getElementsByClassName(
  "commentthread_entry_quotebox"
)) {
  addCharacterCounter(entrybox);
}
