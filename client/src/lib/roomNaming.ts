// A debate room is always the chat room's name plus this suffix. Keeping the
// convention in one place means the two rooms are trivially derivable from
// each other on the client - the server has no opinion on naming at all.
export function debateRoomName(chatRoomName: string): string {
  return `${chatRoomName}::debate`;
}
