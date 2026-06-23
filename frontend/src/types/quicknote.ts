export interface QuickNote {
  id: string;
  patientId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
}
