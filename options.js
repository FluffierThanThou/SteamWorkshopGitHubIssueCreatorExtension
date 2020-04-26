/** @type {HTMLInputElement} */
const token_field = document.getElementById("github_api_token");
const user_field = document.getElementById("github_user");

document.getElementById("save_token_button").addEventListener("click", () => {
  chrome.storage.sync.set({ github_api_token: token_field.value, github_user: user_field.value }, function () {
    console.log("GitHub API token set to " + token_field.value);
    console.log("GitHub user set to " + user_field.value);
  });
});

chrome.storage.sync.get(["github_api_token", "github_user"], (val) => {
  token_field.value = val.github_api_token;
  user_field.value = val.github_user;
})