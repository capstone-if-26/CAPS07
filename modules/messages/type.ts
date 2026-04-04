export type CreateMessageParam = {
    senderType: 'user' | 'assistant' | 'system';
    content: string;
    chatId: string;
    status?: string;
    tokenCount?: number;
    modelName?: string;
    metadata?: string;
};