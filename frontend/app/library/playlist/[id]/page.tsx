"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { columns } from '@/components/ui/columns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from "@/app/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';

interface PlaylistPageProps {
    createdAt: string;
    description: string;
    img: string;
    name: string;
    songs: string[];
    uid: string;
    params: { id: string };
}[]

const PlaylistPage: React.FC<PlaylistPageProps> = ({ params }) => {
    const token = process.env.NEXT_PUBLIC_ACCESS_TOKEN;
    const { id } = params;
    const gradients = [
        "linear-gradient(to right, #a1c4fd, #c2e9fb)",
        "linear-gradient(to right, #d4fc79, #96e6a1)",
        "linear-gradient(to right, #fbc2eb, #a6c1ee)",
        "linear-gradient(to right, #ffecd2, #fcb69f)",
        "linear-gradient(to right, #ff9a9e, #fecfef)",
        "linear-gradient(to right, #f6d365, #fda085)",
        "linear-gradient(to right, #fbc2eb, #a18cd1)",
        "linear-gradient(to right, #ffdde1, #ee9ca7)",
    ];

    const router = useRouter();
    const [user, loading, error] = useAuthState(auth);
    const [fetching, setFetching] = useState(true);

    // if (!user) {
    //     router.push("/login");
    // }

    const [album, setAlbum] = useState<{ img: string, name: string, description: string, background: string }>({ img: "", name: "", description: "", background: "" });
    const [tracks, setTracks] = useState<any[]>([]);

    const fetchSpotify = async () => {
        fetch(`https://api.spotify.com/v1/playlists/${id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                const albumData = {
                    ...data,
                    background: gradients[Math.floor(Math.random() * gradients.length)],
                };
                setAlbum(albumData);
                const formattedTracks = data.tracks.items
                    .filter((item: any) => item.track.type === "track")
                    .map((item: any, index: number) => ({
                        idx: index + 1,
                        id: item.track.id,
                        title: item.track.name,
                        artist: item.track.artists[0].name,
                        album: item.track.album.name,
                        img: item.track.album.images[1].url,
                        date: item.added_at.substring(0, 10),
                        length: new Date(item.track.duration_ms).toISOString(),
                    }));
                setTracks(formattedTracks);
                setFetching(false);
            });
    };

    const fetchLikedTracks = async (idx: number) => {
        if (user?.uid) {
            await getDoc(doc(db, 'users', user.uid))
                .then((doc) => {
                    if (doc.exists()) {
                        setAlbum(doc.data().playlists[idx]);
                        setTracks(doc.data().playlists[idx]?.songs || []);
                    }
                    setFetching(false);
                });
        }
    };

    const fetchUserPlaylists = async (userID: string) => {
        const userDoc = await getDoc(doc(db, 'users', userID));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.playlists || [];
        }
        return [];
    };

    const getIdx = async () => {
        if (user) {
            const playlists = await fetchUserPlaylists(user.uid);
            return playlists.findIndex((playlist: PlaylistPageProps) => playlist.name === album.name);
        }
        return 1;
    }

    const createPlaylist = async () => {
        if (user?.uid) {
            const playlists = await fetchUserPlaylists(user.uid);
            const newPlaylist = {
                createdAt: new Date().toISOString(),
                description: "New Playlist",
                img: "https://firebasestorage.googleapis.com/v0/b/music-app-db471.firebasestorage.app/o/default-playlist.jpg?alt=media&token=4c81b791-83d2-4855-b39e-cb4e7799f3e8",
                name: `Playlist ${playlists.length - 1}`,
                songs: [],
                uid: user.uid,
                background: "-1",
            }
            setAlbum(newPlaylist);
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    playlists: [...playlists, newPlaylist],
                });
            } catch (error) {
                console.error(error);
            }
        }
    };

    useEffect(() => {
        if (!loading && user) {
            if (id === 'liked-songs') {
                fetchLikedTracks(1);
            }
            else if (id === "add-playlist") {
                createPlaylist();
            }
            else if (id.length === 22) {
                fetchSpotify();
            }
            else {
                getIdx().then(idx => fetchLikedTracks(idx));
            }
        }
    }, [user, loading, error]);

    return (
        <div className='flex min-h-screen min-w-screen bg-gradient-to-b from-[#180F18] to-[#1D1D20]'>
            <div className="min-h-screen w-1/3 flex justify-center items-center">
                <div className="text-white w-[80%] flex justify-center items-center flex-col">
                    {!album || album.img === "" ? (
                        <>
                            <Skeleton className='w-[20vw] h-[20vw] rounded-[10%]' />
                            <Skeleton className='w-[16vw] h-[2.5vw] my-[3vh]' />
                            <Skeleton className='w-[14vw] h-[2vh]' />
                        </>
                    ) : (
                        album.background !== "-1" ? (
                            <>
                                <Card style={{ background: album.background }}>
                                    <CardContent className="flex w-[20vw] h-[20vw] rounded-[10%] items-center justify-center p-6 bg-[#747474] bg-opacity-20 text-center">
                                        <span className="text-[4vw] text-[#0E0317] font-semibold">
                                            {album.name}
                                        </span>
                                    </CardContent>
                                </Card>
                                <div className="px-[2vw]">
                                    <h1 className='p-3 text-[1.5vw] text-center'>{album.description}</h1>
                                </div>
                            </>
                        ) : (
                            <>
                                <img src={album.img} alt={album.name} className='w-[20vw] h-[20vw] rounded-[10%]' />
                                <h1 className='p-3 text-[2.5vw] font-bold'>{album.name}</h1>
                                <h2 className='text-[1vw]'>{album.description}</h2>
                            </>
                        )
                    )}
                </div>
            </div>
            <div className="max-h-screen w-2/3 flex justify-center items-center">
                <DataTable columns={columns} data={tracks} fetching={fetching} />
            </div>
        </div>
    );
};

export default PlaylistPage;