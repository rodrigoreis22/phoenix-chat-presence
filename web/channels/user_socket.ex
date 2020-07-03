defmodule Chat.UserSocket do
  use Phoenix.Socket

  channel "rooms:*", Chat.RoomChannel

  def connect(params, socket) do
    {:ok, assign(socket, :user_id, params["user_id"])}
  end

  def id(_socket), do: nil
end
