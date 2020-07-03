import { Socket, LongPoller, Presence } from "phoenix";

let userId = Date.now().toString();

class App {
  static init() {
    let socket = new Socket("/socket", {
      logger: (kind, msg, data) => {
        console.log(`${kind}: ${msg}`, data);
      },
      params: { user_id: userId },
    });
    socket.connect();
    var $status = $("#status");
    var $messages = $("#messages");
    var $input = $("#message-input");
    var $username = $("#username");

    socket.onOpen((ev) => console.log("OPEN", ev));
    socket.onError((ev) => console.log("ERROR", ev));
    socket.onClose((e) => console.log("CLOSE", e));

    var channel = socket.channel("rooms:x", {});
    channel.join();
    let presence = new Presence(channel);
    channel.onError((e) => console.log("something went wrong", e));
    channel.onClose((e) => console.log("channel closed", e));

    $input.off("keypress").on("keypress", (e) => {
      if (e.keyCode == 13) {
        const msg = $input.val();
        if (!msg) return;
        channel.push("new:msg", { user: $username.val(), body: msg });
        userStopsTyping();
        $input.val("");
      }
    });
    const typingTimeout = 2000;
    var typingTimer;
    let userTyping = false;

    const userStartsTyping = function () {
      if (userTyping) {
        return;
      }

      userTyping = true;
      channel.push("user:typing", { typing: true });
    };

    const userStopsTyping = function () {
      clearTimeout(typingTimer);
      userTyping = false;
      channel.push("user:typing", { typing: false });
    };

    document.querySelector("#message-input").addEventListener("keydown", () => {
      userStartsTyping();
      clearTimeout(typingTimer);
    });

    document.querySelector("#message-input").addEventListener("keyup", () => {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(userStopsTyping, typingTimeout);
    });

    channel.on("new:msg", (msg) => {
      if (msg.user === "SYSTEM") return;
      $messages.append(this.messageTemplate(msg));
      scrollTo(0, document.body.scrollHeight);
    });

    presence.onSync(() => this.renderOnlineUsers(presence));
  }

  static renderOnlineUsers(presence) {
    function filterTypingOnly(id, { metas: [first, ...rest] }) {
      if (id !== userId && first.typing) return first;
    }
    if (!presence) return;
    const typingUsers = presence.list(filterTypingOnly).filter((x) => x);
    if (typingUsers.length > 0) {
      document.getElementById("typing").style.display = "block";
    } else {
      document.getElementById("typing").style.display = "none";
    }
    $("#online-count-input").val(
      `${Object.keys(presence.state).length} online`
    );
  }

  static sanitize(html) {
    return $("<div/>").text(html).html();
  }

  static messageTemplate(msg) {
    let username = this.sanitize(msg.user || "anonymous");
    let body = this.sanitize(msg.body);

    return `<p><a href='#'>[${username}]</a>&nbsp; ${body}</p>`;
  }
}

$(() => App.init());

export default App;
