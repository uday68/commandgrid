import Trello from 'trello';

class TrelloService {
  constructor() {
    this.client = null;
  }

  async initialize(apiKey, token) {
    this.client = new Trello(apiKey, token);
  }

  async checkStatus() {
    try {
      // Test API connection by getting member info
      await this.client.getMember('me');
      return {
        status: 'connected',
        details: 'Trello is connected and working properly'
      };
    } catch (error) {
      return {
        status: 'disconnected',
        details: `Trello connection failed: ${error.message}`
      };
    }
  }

  async listBoards() {
    try {
      const boards = await this.client.getBoards('me');
      return boards;
    } catch (error) {
      console.error('Error listing Trello boards:', error);
      throw error;
    }
  }

  async createBoard(name, description = '') {
    try {
      const board = await this.client.addBoard(name, {
        defaultLists: true,
        desc: description
      });
      return board;
    } catch (error) {
      console.error('Error creating Trello board:', error);
      throw error;
    }
  }

  async listLists(boardId) {
    try {
      const lists = await this.client.getListsOnBoard(boardId);
      return lists;
    } catch (error) {
      console.error('Error listing Trello lists:', error);
      throw error;
    }
  }

  async createList(boardId, name, position = 'bottom') {
    try {
      const list = await this.client.addList(name, boardId, position);
      return list;
    } catch (error) {
      console.error('Error creating Trello list:', error);
      throw error;
    }
  }

  async createCard(listId, name, description = '') {
    try {
      const card = await this.client.addCard(name, description, listId);
      return card;
    } catch (error) {
      console.error('Error creating Trello card:', error);
      throw error;
    }
  }

  async updateCard(cardId, updates) {
    try {
      const card = await this.client.updateCard(cardId, updates);
      return card;
    } catch (error) {
      console.error('Error updating Trello card:', error);
      throw error;
    }
  }

  async moveCard(cardId, listId, position = 'bottom') {
    try {
      const card = await this.client.updateCard(cardId, {
        idList: listId,
        pos: position
      });
      return card;
    } catch (error) {
      console.error('Error moving Trello card:', error);
      throw error;
    }
  }

  async addMemberToBoard(boardId, email) {
    try {
      const member = await this.client.addMemberToBoard(boardId, email);
      return member;
    } catch (error) {
      console.error('Error adding member to Trello board:', error);
      throw error;
    }
  }

  async addLabelToCard(cardId, labelId) {
    try {
      const result = await this.client.addLabelToCard(cardId, labelId);
      return result;
    } catch (error) {
      console.error('Error adding label to Trello card:', error);
      throw error;
    }
  }

  async createLabel(boardId, name, color) {
    try {
      const label = await this.client.addLabelToBoard(boardId, name, color);
      return label;
    } catch (error) {
      console.error('Error creating Trello label:', error);
      throw error;
    }
  }
}

export default new TrelloService(); 