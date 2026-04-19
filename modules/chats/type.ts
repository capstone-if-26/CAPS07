export type Chats = {
    id: string;
    senderType: string | null;
    content: string | null;
    status: string | null;
    tokenCount: number | null;
    modelName: string | null;
    parentMessage: string | null;
    turnIndex: string | null;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    chatId: string;
}