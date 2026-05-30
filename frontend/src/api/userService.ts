import { api } from "./axios";
import type { User } from "../types/user";

export const userService = {
  async getUsers(): Promise<User[]> {
    const res = await api.get(`/users?_t=${Date.now()}`);
    return res.data.users;
  },

  async createUser(prefix: string) {
    await api.post(`/users`, { prefix });
  },

  async deleteUser(id: string) {
    await api.delete(`/users/${id}`);
  },

  async toggleUser(id: string, enable: boolean) {
    await api.post(`/users/${id}/toggle?enable=${enable}`);
  },

  async getUserLink(id: string): Promise<string> {
    const res = await api.get(`/users/${id}/link`);
    return res.data.link;
  },

  async updateSystem() {
    await api.post(`/system/update`);
  }
};
