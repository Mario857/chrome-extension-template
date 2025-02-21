/* popup.js
 *
 * This file initializes its scripts after the popup has loaded.
 *
 * It shows how to access global variables from background.js.
 * Note that getViews could be used instead to access other scripts.
 *
 * A port to the active tab is open to send messages to its in-content.js script.
 *
 */


console = chrome.extension.getBackgroundPage().console;
const saveHistoryButton = document.getElementById('saveHistoryButton');
const loadHistoryFileButton = document.getElementById('loadHistoryFileButton');

const setTempStorage = ({ key, value }) => {
    chrome.tabs.executeScript({ code: `localStorage.setItem('${key}', '${value}')` });
}

const getTempStorage = ({ key, callback }) => {
    chrome.tabs.executeScript({
        code: `(function getTemp(){
        const temp = localStorage.getItem('${key}');
        return { temp };
      })()` }, function (result) {
        callback(JSON.parse(result[0].temp));
    });
}

const getHistoryLinksScript = `(function getUrls(){
    const urls = Array.from({ length: document.getElementsByClassName("col title").length }).map((_, i) => document.getElementsByClassName("col title")[i].children[0].getAttribute('href'))
    return { urls };
  })()`;


saveHistoryButton.onclick = function (element) {
    chrome.tabs.executeScript({
        code: `(function expand(){
    
        document.getElementsByClassName("btn-bar top-padding btn-bar-left")[0].children[0].click();

        return { done: document.getElementsByClassName("btn-bar top-padding btn-bar-left")[0].children[0].disabled };
      })()`}, function (result) {
        if (result[0].done) {
            chrome.tabs.executeScript({
                code: `(function getUrls(){
                            const urls = Array.from({ length: document.getElementsByClassName("col title").length })
                            .map((_, i) => document.getElementsByClassName("col title")[i].children[0].getAttribute('href'))
                            return { urls };
                            })()
          `}, function (result) {
                const urlLinks = result[0].urls.map(x => `https://www.netflix.com${x.replace('/title/', '/watch/')}`).reverse();
                setTempStorage({ key: 'history', value: JSON.stringify(urlLinks) });
            });
        } else {
            setTimeout(saveHistoryButton.onclick(), 100);
        }
    });
}

loadHistoryFileButton.onclick = function (element) {

    getTempStorage({
        key: 'history', callback: (history) => {
            history.forEach((x, i) => {
                setTimeout(() => {
                    chrome.tabs.executeScript({ code: `window.location.replace('${x}');` })
                }, 4000 * i)
            })
        }
    })
}


// Start the popup script, this could be anything from a simple script to a webapp
const initPopupScript = () => {
    // Access the background window object
    const backgroundWindow = chrome.extension.getBackgroundPage();
    // Do anything with the exposed variables from background.js
    console.log(backgroundWindow.sampleBackgroundGlobal);

    // This port enables a long-lived connection to in-content.js
    let port = null;

    // Send messages to the open port
    const sendPortMessage = message => port.postMessage(message);

    // Find the current active tab
    const getTab = () =>
        new Promise(resolve => {
            chrome.tabs.query(
                {
                    active: true,
                    currentWindow: true
                },
                tabs => resolve(tabs[0])
            );
        });

    // Handle port messages
    const messageHandler = message => {
        console.log('popup.js - received message:', message);
    };

    // Find the current active tab, then open a port to it
    getTab().then(tab => {
        // Connects to tab port to enable communication with inContent.js
        port = chrome.tabs.connect(tab.id, { name: 'chrome-extension-template' });
        // Set up the message listener
        port.onMessage.addListener(messageHandler);
        // Send a test message to in-content.js
        sendPortMessage('Message from popup!');
    });
};

// Fire scripts after page has loaded
document.addEventListener('DOMContentLoaded', initPopupScript);




