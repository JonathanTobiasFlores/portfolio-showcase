'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, signOut, getProfile, Profile } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Loader2, LogOut, Settings, Palette } from 'lucide-react';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data } = await getCurrentUser();
      
      if (data.user) {
        setUser(data.user);
        
        // Load profile data
        const { data: profileData } = await getProfile(data.user.id);
        if (profileData) {
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="p-2">
        <Loader2 className="h-5 w-5 animate-spin text-mint-3" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-mint-1 transition-all">
          <Avatar className="h-10 w-10 border-2 border-mint-2">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-mint-2 text-foreground">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 bg-white/95 backdrop-blur-lg border-mint-2/30">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-mint-2">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-mint-2 text-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          
          <div className="border-t border-mint-2/30 pt-2 flex flex-col gap-2">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-mint-1 transition-all"
              onClick={() => router.push('/settings')}
            >
              <Settings className="mr-2 h-4 w-4 text-mint-3" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-mint-1 transition-all"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              {loggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4 text-mint-3" />
                  Sign out
                </>
              )}
            </Button>
          </div>
          
          {profile?.color && (
            <div className="border-t border-mint-2/30 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palette className="h-4 w-4" />
                <span>Your color:</span>
                <div 
                  className="w-6 h-6 rounded-full border-2 border-mint-2"
                  style={{ backgroundColor: profile.color }}
                />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}