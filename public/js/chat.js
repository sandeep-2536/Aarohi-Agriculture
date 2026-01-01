// client-side chat logic
// requires: socket.io client (script included in EJS), fetch API

(function () {
    const socket = io();

    const CURRENT_USER = window.CURRENT_USER;
    const CHAT_ROOM = window.CHAT_ROOM;

    const messagesEl = document.getElementById("messages");
    const sendForm = document.getElementById("sendForm");
    const messageInput = document.getElementById("messageInput");
    const imageInput = document.getElementById("imageInput");
    const refreshBtn = document.getElementById("refreshBtn");
    const voiceBtn = document.getElementById("voiceBtn");

    // Helper: create message DOM node
    function createMessageNode(msg) {
        const isMine = msg.user && (msg.user._id === CURRENT_USER._id || msg.user._id === CURRENT_USER._id.toString());
        const wrapper = document.createElement("div");
        wrapper.className = `message ${isMine ? "mine" : "other"}`;
        wrapper.dataset.id = msg._id;

        const left = document.createElement("div");
        left.className = "msg-left";
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        avatar.src = (msg.user && msg.user.profileImage) ? msg.user.profileImage : "/images/default-user.png";
        left.appendChild(avatar);

        const body = document.createElement("div");
        body.className = "msg-body";

        const meta = document.createElement("div");
        meta.className = "msg-meta";
        const author = document.createElement("span");
        author.className = "msg-author";
        author.textContent = msg.user ? msg.user.name : "Unknown";
        const time = document.createElement("span");
        time.className = "msg-time";
        time.textContent = new Date(msg.createdAt).toLocaleString();

        meta.appendChild(author);
        meta.appendChild(time);

        const text = document.createElement("div");
        text.className = "msg-text";
        text.textContent = msg.text || "";

        body.appendChild(meta);
        body.appendChild(text);

        if (msg.image) {
            const imgWrap = document.createElement("div");
            imgWrap.className = "msg-image";
            const im = document.createElement("img");
            im.src = msg.image;
            imgWrap.appendChild(im);
            body.appendChild(imgWrap);
        }

        // actions
        const actions = document.createElement("div");
        actions.className = "msg-actions";

        const replyBtn = document.createElement("button");
        replyBtn.className = "action-btn reply-btn";
        replyBtn.textContent = "Reply";
        actions.appendChild(replyBtn);

        if (isMine) {
            const editBtn = document.createElement("button");
            editBtn.className = "action-btn edit-btn";
            editBtn.textContent = "Edit";
            actions.appendChild(editBtn);

            const delBtn = document.createElement("button");
            delBtn.className = "action-btn delete-btn";
            delBtn.textContent = "Delete";
            actions.appendChild(delBtn);
        }

        body.appendChild(actions);

        wrapper.appendChild(left);
        wrapper.appendChild(body);

        // event handlers for edit/delete/reply
        if (isMine) {
            const editBtn = wrapper.querySelector(".edit-btn");
            const delBtn = wrapper.querySelector(".delete-btn");

            editBtn.addEventListener("click", () => startEditMessage(wrapper.dataset.id, wrapper));
            delBtn.addEventListener("click", () => deleteMessage(wrapper.dataset.id));
        }

        const reply = wrapper.querySelector(".reply-btn");
        reply.addEventListener("click", () => {
            const textToReply = prompt("Type your reply:");
            if (textToReply && textToReply.trim().length) {
                // Post reply as a normal message prefixed with reply (threading enhancement later)
                sendMessage(textToReply, null, wrapper.dataset.id);
            }
        });

        return wrapper;
    }

    // append message to messages area
    function appendMessage(msg) {
        const node = createMessageNode(msg);
        messagesEl.appendChild(node);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // update existing message in DOM
    function updateMessageInDOM(msg) {
        const el = messagesEl.querySelector(`[data-id="${msg._id}"]`);
        if (!el) return;
        const textEl = el.querySelector(".msg-text");
        textEl.textContent = msg.text;
        if (msg.edited) {
            const meta = el.querySelector(".msg-meta");
            const timeEl = el.querySelector(".msg-time");
            timeEl.textContent = new Date(msg.createdAt).toLocaleString() + " (edited)";
        }
    }

    // remove message
    function removeMessageFromDOM(id) {
        const el = messagesEl.querySelector(`[data-id="${id}"]`);
        if (el) {
            el.remove();
        }
    }

    // send message (optionally replyParent)
    async function sendMessage(text, imagePath = null, replyTo = null) {
        if ((!text || !text.trim()) && !imagePath) return;

        // message object we send to server via socket
        const payload = {
            roomId: CHAT_ROOM.id,
            text: text,
            image: imagePath || null,
            user: CURRENT_USER, // server should override with session-based user id
            createdAt: new Date().toISOString()
        };

        // Send via socket. Server should save to DB and broadcast back the complete message object
        socket.emit("sendMessage", payload);

        // Optimistic UI: append temporary message (server will broadcast actual saved message)
        // optional: don't append here to avoid duplicates if server echoes
    }

    // Upload image to server: expects endpoint POST /community/chat/upload
    async function uploadImage(file) {
        if (!file) return null;
        const form = new FormData();
        form.append("image", file);

        try {
            const res = await fetch("/community/chat/upload", {
                method: "POST",
                body: form
            });
            const data = await res.json();
            if (data && data.path) return data.path;
            return null;
        } catch (err) {
            console.error("Upload failed", err);
            return null;
        }
    }

    // Delete request
    async function deleteMessage(id) {
        if (!confirm("Delete this message?")) return;
        try {
            const res = await fetch(`/community/chat/message/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                // notify server via socket so other clients remove it
                socket.emit("deleteMessage", id);
                removeMessageFromDOM(id);
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Edit flow
    function startEditMessage(id, node) {
        const textEl = node.querySelector(".msg-text");
        const current = textEl.textContent;
        const newText = prompt("Edit message:", current);
        if (newText === null) return;
        fetch(`/community/chat/message/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: newText })
        }).then(r => r.json()).then(resp => {
            if (resp.success) {
                // notify server via socket
                const payload = { _id: id, text: newText, edited: true, createdAt: new Date().toISOString() };
                socket.emit("updateMessage", payload);
                updateMessageInDOM(payload);
            }
        }).catch(console.error);
    }

    // submit send form
    sendForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        const file = imageInput.files[0];

        let imagePath = null;
        if (file) {
            imagePath = await uploadImage(file);
            // clear file input
            imageInput.value = "";
        }

        await sendMessage(text, imagePath);
        messageInput.value = "";
    });

    // refresh button
    refreshBtn && refreshBtn.addEventListener("click", () => {
        location.reload();
    });

    // voice input (basic Web Speech integration)
    if (voiceBtn) {
        let recog;
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recog = new SpeechRecognition();
            recog.lang = "en-IN";
            recog.interimResults = false;
            recog.onresult = (e) => {
                const spoken = e.results[0][0].transcript;
                messageInput.value = messageInput.value ? messageInput.value + " " + spoken : spoken;
            };
        } else {
            recog = null;
        }

        voiceBtn.addEventListener("click", () => {
            if (!recog) {
                alert("Speech not supported in this browser.");
                return;
            }
            recog.start();
        });
    }

    // SOCKET.IO EVENTS
    socket.on("connect", () => {
        console.log("Connected to chat server", socket.id);
        // join room (optional server-side)
        socket.emit("joinRoom", { roomId: CHAT_ROOM.id });
    });

    // When server broadcasts a saved message
    socket.on("receiveMessage", (msg) => {
        // server should send full message object including _id, user, createdAt
          const lang = localStorage.getItem("aarohi_lang") || "en";
  voiceSpeak(msg.text[lang] || msg.text.original || msg.text);
        appendMessage(msg);
    });

    socket.on("messageDeleted", (id) => {
        removeMessageFromDOM(id);
    });

    socket.on("messageUpdated", (msg) => {
        updateMessageInDOM(msg);
    });

    // attach edit/delete handlers to server-rendered messages (initial page load)
    (function attachHandlersForExisting() {
        const nodes = document.querySelectorAll(".message");
        nodes.forEach(node => {
            const id = node.dataset.id;
            const isMine = node.classList.contains("mine");

            if (isMine) {
                const editBtn = node.querySelector(".edit-btn");
                const delBtn = node.querySelector(".delete-btn");

                if (editBtn) {
                    editBtn.addEventListener("click", () => startEditMessage(id, node));
                }
                if (delBtn) {
                    delBtn.addEventListener("click", () => deleteMessage(id));
                }
            }

            const replyBtn = node.querySelector(".reply-btn");
            if (replyBtn) {
                replyBtn.addEventListener("click", () => {
                    const replyText = prompt("Type your reply:");
                    if (replyText && replyText.trim()) {
                        sendMessage(replyText, null, id);
                    }
                });
            }
        });
    })();

})();
