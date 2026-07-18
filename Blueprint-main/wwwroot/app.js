"use strict";

const pingButton = document.getElementById("ping-button");
const message = document.getElementById("message");

pingButton.addEventListener("click", async () => {
    pingButton.disabled = true;
    try {
        const body = await fetchJson("/api/ping");
        showMessage(`The API says: ${body}`);
    } catch (err) {
        showMessage(err.message, true);
    } finally {
        pingButton.disabled = false;
    }
});

async function fetchJson(url, options) {
    const resp = await fetch(url, options);
    const body = await resp.json().catch(() => null);
    if (!resp.ok) {
        throw new Error(errorMessage(body, resp.status));
    }
    return body;
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.className = isError ? "error" : "";
    message.hidden = false;
}

// Extracts a readable message from a FastEndpoints error response,
// e.g. { message, errors: { generalErrors: ["..."] } }.
function errorMessage(body, status) {
    if (body && body.errors) {
        const messages = Object.values(body.errors).flat().filter(Boolean);
        if (messages.length) {
            return messages.join(" ");
        }
    }
    if (body && body.message) {
        return body.message;
    }
    return `Request failed (${status}).`;
}
