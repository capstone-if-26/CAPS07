import { getAllDocuments } from './repository';

export async function fetchAllAvailableDocuments() {
  return await getAllDocuments();
}
