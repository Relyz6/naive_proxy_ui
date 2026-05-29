export type User = {
  id: string;
  seq_id: number;
  login: string;
  password?: string;
  link?: string;
  desktop?: string;
  enabled: boolean;
};
