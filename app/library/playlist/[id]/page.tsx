"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { columns } from '@/components/ui/columns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from "@/app/firebase/config";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    const [isOpen, setIsOpen] = useState(false);

    function formatDuration(milliseconds: string) {
        const totalSeconds = Math.floor(Number(milliseconds) / 1000);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    function formatDate(date: Date) {

        const dateObj = date instanceof Date ? date : new Date(date);

        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }

        return dateObj.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
    }

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
                        date: formatDate(item.added_at.substring(0, 10)),
                        length: formatDuration(item.track.duration_ms),
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
            return playlists.findIndex((playlist: PlaylistPageProps) => playlist.name.toLowerCase().replace(" ", "-") === id);
        }
        return 1;
    }

    const createPlaylist = async () => {
        if (user?.uid) {
            const playlists = await fetchUserPlaylists(user.uid);
            const newPlaylist = {
                createdAt: new Date().toISOString(),
                description: "New Playlist",
                img: "https://firebasestorage.googleapis.com/v0/b/music-app-db471.firebasestorage.app/o/default-playlist.webp?alt=media&token=37143ca6-2abc-4816-8bdc-0c92c5a38d8d",
                name: `Playlist ${playlists.length - 1}`,
                songs: [],
                uid: user.uid,
                background: "-1",
            }
            setAlbum(newPlaylist);
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    playlists: [...playlists, newPlaylist],
                })
                    .then(() => {
                        router.push(`/library/playlist/${newPlaylist.name.toLowerCase().replace(" ", "-")}`);
                    })
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleChangesSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (user) {
            const form = e.currentTarget;
            const name = form.elements.namedItem('name') as HTMLInputElement;
            const description = form.elements.namedItem('description') as HTMLInputElement;

            const playlists = await fetchUserPlaylists(user.uid);
            const idx = playlists.findIndex((playlist: PlaylistPageProps) =>
                playlist.name.toLowerCase().replace(" ", "-") === id
            );

            playlists[idx] = {
                ...playlists[idx],
                name: name.value,
                description: description.value,
            };
            await updateDoc(doc(db, 'users', user.uid), {
                playlists: playlists,
            })
                .then(() => {
                    setAlbum(playlists[idx]);
                    setIsOpen(false);
                    router.push(`/library/playlist/${playlists[idx].name.toLowerCase().replace(" ", "-")}`);
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    };

    const handleFileUpload = async (files: File[]) => {
        if (user) {
            const playlists = await fetchUserPlaylists(user.uid);
            const idx = playlists.findIndex((playlist: PlaylistPageProps) => playlist.name.toLowerCase().replace(" ", "-") === id);
            const storageRef = ref(storage, `users/${user.uid}/${playlists[idx].name}.webp`);
            const uploadTask = await uploadBytes(storageRef, files[0]);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            playlists[idx] = {
                ...playlists[idx],
                img: downloadURL,
            };
            await updateDoc(doc(db, 'users', user.uid), {
                playlists: playlists,
            })
                .then(() => {
                    setAlbum(playlists[idx]);
                })
                .catch((error) => {
                    console.error(error);
                });

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
                                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant={"ghost"} className="flex justify-center flex-col h-[10vh] hover:text-stone-400 text-white pt-8">
                                            <h1 className='pb-6 text-[2.5vw] font-bold'>{album.name}</h1>
                                            <h2 className='text-[1vw]'>{album.description}</h2>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <form onSubmit={handleChangesSubmit}>
                                            <DialogHeader>
                                                <DialogTitle>Edit Playlist</DialogTitle>
                                                <DialogDescription>
                                                    Make changes to your playlist here. Click save when you're done.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="name" className="text-right text-[#e2e2e2]">
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        defaultValue={album.name}
                                                        className="col-span-3 hover:bg-[#352f3e]"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="description" className="text-right text-[#e2e2e2]">
                                                        Description
                                                    </Label>
                                                    <Input
                                                        id="description"
                                                        name="description"
                                                        defaultValue={album.description}
                                                        className="col-span-3 hover:bg-[#352f3e]"
                                                    />
                                                </div>
                                                <FileUpload onChange={handleFileUpload} />
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" variant={"outline"} className="hover:bg-[#352f3e]">Save changes</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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