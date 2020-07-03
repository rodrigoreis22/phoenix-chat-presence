defmodule Chat.RoomChannel do
  use Phoenix.Channel
  alias ChatWeb.Presence
  require Logger

  @doc """
  Authorize socket to subscribe and broadcast events on this channel & topic

  Possible Return Values

  `{:ok, socket}` to authorize subscription for channel for requested topic

  `:ignore` to deny subscription/broadcast on this channel
  for the requested topic
  """
  def join("rooms:" <> room_id, _params, socket) do
    Logger.debug"joined room: #{inspect room_id}"
    :timer.send_interval(15000, :ping)
    send(self(), :after_join)
    {:ok, socket}
  end

  def handle_info(:after_join, socket) do
    {:ok, _} = Presence.track(socket, socket.assigns.user_id, %{
      online_at: inspect(System.system_time(:second))
    })
    # broadcast! socket, "user:entered", %{user: msg["user"]}
    push socket, "presence_state", Presence.list(socket)
    # push socket, "join", %{status: "connected"}
    {:noreply, socket}
  end

  def handle_info(:ping, socket) do
    push socket, "new:msg", %{user: "SYSTEM", body: "ping"}
    {:noreply, socket}
  end

  def terminate(reason, _socket) do
    Logger.debug"> leave #{inspect reason}"
    :ok
  end

  def handle_in("new:msg", msg, socket) do
    broadcast! socket, "new:msg", %{user: msg["user"], body: msg["body"]}
    {:reply, {:ok, %{msg: msg["body"]}}, assign(socket, :user, msg["user"])}
  end

  def handle_in("user:typing", %{"typing" => typing}, socket) do
    {:ok, _} = Presence.update(socket, socket.assigns.user_id, %{
      typing: typing,
      online_at: inspect(System.system_time(:second)),
      user_id: socket.assigns.user_id
    })
    {:reply, :ok, socket}
  end
end
