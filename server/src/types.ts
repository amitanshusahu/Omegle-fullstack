export interface room {
  roomid: string,
  isAvailable: boolean,
  p1: {
    id: string | null,
  },
  p2: {
    id: string | null,
  }
}

export type GetTypesResult = 
| { type: 'p1', p2id: string | null }
| { type: 'p2', p1id: string | null }
| false;