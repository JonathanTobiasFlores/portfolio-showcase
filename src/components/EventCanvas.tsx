'use client';

import { useState, useEffect } from 'react';
import { Event, Painting } from '@/app/types/canvas';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import PaintingCard from '@/components/canvas/PaintingCard';
import CreatePaintingDialog from '@/components/canvas/CreatePaintingDialog';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { getOrCreateUser } from '@/lib/utils/user';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
}

function CreateListDialog({ isOpen, onClose, eventId, userId }: CreateListDialogProps) {
  const [title, setTitle] = useState('');
  const [item, setItem] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleAddItem = () => {
    if (item.trim()) {
      setItems([...items, item.trim()]);
      setItem('');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const id = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await supabase.from('lists').insert({
      id,
      title,
      items,
      created_by: userId,
      event_id: eventId,
    });
    setTitle('');
    setItems([]);
    setItem('');
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-mint-1 border-mint-2/30">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">Create List</DialogTitle>
          <DialogDescription>Add a new list for your event. You can add items below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="space-y-4">
          <div>
            <Label htmlFor="list-title">List Title</Label>
            <Input
              id="list-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="List Title"
              required
              disabled={loading}
              className="bg-mint-0 border-mint-2/50 focus:ring-mint-2"
            />
          </div>
          <div>
            <Label htmlFor="add-item">Add Item</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="add-item"
                className="flex-1 bg-mint-0 border-mint-2/50 focus:ring-mint-2"
                placeholder="Add item"
                value={item}
                onChange={e => setItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                disabled={loading}
              />
              <Button onClick={handleAddItem} type="button" disabled={loading || !item.trim()} className="bg-mint-3 hover:bg-mint-3/90 text-white">Add</Button>
            </div>
          </div>
          <ul className="list-disc pl-5 mb-2 text-muted-foreground">
            {items.map((pt, idx) => <li key={idx}>{pt}</li>)}
          </ul>
          <DialogFooter className="flex gap-2 justify-end pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading} className="border-mint-2/50">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading || !title.trim() || items.length === 0} className="bg-mint-3 hover:bg-mint-3/90 text-white">
              {loading ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EventCanvasProps {
  event: Event;
}

export default function EventCanvas({ event }: EventCanvasProps) {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [openType, setOpenType] = useState<null | 'canvas' | 'list'>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const user = getOrCreateUser();

  const loadAll = async () => {
    const { data: paintingsData } = await supabase
      .from('paintings')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    setPaintings(paintingsData || []);
    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    setLists(listsData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // Real-time for paintings
    const paintingsChannel = supabase
      .channel(`paintings:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paintings',
          filter: `event_id=eq.${event.id}`,
        },
        () => loadAll()
      )
      .subscribe();
    // Real-time for lists
    const listsChannel = supabase
      .channel(`lists:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `event_id=eq.${event.id}`,
        },
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(paintingsChannel);
      supabase.removeChannel(listsChannel);
    };
  }, [event.id, supabase]);

  return (
    <div className="min-h-screen bg-mint-0">
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-mint-0/80 border-b border-mint-2/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="hover:bg-mint-1">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{event.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.date), 'PPP')}
                </p>
              </div>
            </div>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="gap-2 bg-mint-3 hover:bg-mint-3/90 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <Plus className="h-4 w-4" /> New
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-32 p-0 bg-mint-1 border-mint-2/30">
                <div className="flex flex-col">
                  <Button variant="ghost" className="justify-start rounded-none hover:bg-mint-2/30" onClick={() => { setOpenType('canvas'); setPopoverOpen(false); }}>Canvas</Button>
                  <Button variant="ghost" className="justify-start rounded-none hover:bg-mint-2/30" onClick={() => { setOpenType('list'); setPopoverOpen(false); }}>List</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <CreatePaintingDialog
        eventId={event.id}
        isOpen={openType === 'canvas'}
        onClose={() => setOpenType(null)}
        onPaintingCreated={loadAll}
      />
      <CreateListDialog
        isOpen={openType === 'list'}
        onClose={() => setOpenType(null)}
        eventId={event.id}
        userId={user.id}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint-2 border-t-mint-3 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            <div className="mb-10 animate-fade-in-up">
              <h2 className="text-xl font-semibold mb-4 tracking-tight">Canvases</h2>
              {paintings.length === 0 ? (
                <div className="text-muted-foreground bg-mint-1/50 rounded-2xl p-8 text-center">No canvases yet. Create one to start drawing!</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {paintings.map((painting, index) => (
                    <div key={painting.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <PaintingCard painting={painting} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-xl font-semibold mb-4 tracking-tight">Lists</h2>
              {lists.length === 0 ? (
                <div className="text-muted-foreground bg-mint-1/50 rounded-2xl p-8 text-center">No lists yet. Create one to get organized!</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {lists.map((list, index) => (
                    <div key={list.id} className="bg-mint-1 rounded-2xl shadow-lg p-6 animate-fade-in-up hover:shadow-xl transition-all" style={{ animationDelay: `${(index + paintings.length) * 50}ms` }}>
                      <h3 className="text-lg font-semibold mb-2 tracking-tight">{list.title}</h3>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {Array.isArray(list.items) ? list.items.map((item: string, idx: number) => (
                          <li key={idx} className="text-sm">{item}</li>
                        )) : null}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-4">Created {format(new Date(list.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}