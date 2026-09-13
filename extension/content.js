async function loadAssistant() {
  if (document.getElementById("classroom-assistant-button")) {
    return;
  }

  const htmlURL = chrome.runtime.getURL("menu.html");
  const response = await fetch(htmlURL);
  const html = await response.text();

  const container = document.createElement("div");
  container.id = "classroom-assistant-container";
  container.innerHTML = html;

  document.body.appendChild(container);

  const button = document.getElementById("classroom-assistant-button");
  const buttonImg = document.getElementById("assistant-button-img");
  const popup = document.getElementById("classroom-assistant-popup");
  const closeButton = document.getElementById("assistant-close-button");

  buttonImg.src = chrome.runtime.getURL("mascot/anim/7s_idle.gif");;

  // Open / close popup
  button.addEventListener("click", () => {
    popup.classList.toggle("open");
  });

  closeButton.addEventListener("click", () => {
  popup.classList.remove("open");
});
}

loadAssistant();