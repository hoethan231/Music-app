"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input-two";
import { cn } from "@/lib/utils";
import { IconBrandGoogle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/app/firebase/config" 
import { useCreateUserWithEmailAndPassword, useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { doc, setDoc } from "firebase/firestore"; 
import { updateProfile } from "firebase/auth";
import { useAuthState } from 'react-firebase-hooks/auth';

export default function page() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);
  const [signUserWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const email = (e.target as HTMLFormElement).email.value;
      const password = (e.target as HTMLFormElement).password.value;
      const firstName = (e.target as HTMLFormElement).firstname.value;
      const lastName = (e.target as HTMLFormElement).lastname.value;
  
      const userCredential = await createUserWithEmailAndPassword(email, password);
      if (userCredential) {
        const user = userCredential.user;
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`,
        });
        try {
          signUserWithEmailAndPassword(email, password).then((userCredential) => {
            if (userCredential) {
              const user = userCredential.user;
              sessionStorage.setItem("user", JSON.stringify(user));
              router.push("/explore");
            }
          });
          await setDoc(doc(db, "users", user.uid), {
            first: user.displayName?.split(" ")[0],
            last: user.displayName?.split(" ")[1],
            email: user.email,
            uid: user.uid,
            createdAt: new Date().toISOString(),
            pfp: "https://firebasestorage.googleapis.com/v0/b/music-app-db471.firebasestorage.app/o/default-pfp.png?alt=media&token=647a3cc7-1c60-465f-921e-0b0793cbdb95",
            playlists: [
              {
                name: "Add Playlist",
                description: "",
                songs: [],
                createdAt: new Date().toISOString(),
                img: "https://firebasestorage.googleapis.com/v0/b/music-app-db471.firebasestorage.app/o/add-playlist.png?alt=media&token=d1296346-4a91-4213-b7a6-6428b6f36ea2",
              },
              {
                name: "Liked Songs",
                description: "Songs you've liked",
                songs: [],
                createdAt: new Date().toISOString(),
                img: "https://firebasestorage.googleapis.com/v0/b/music-app-db471.firebasestorage.app/o/liked-playlist.png?alt=media&token=51357e62-c1ea-43ea-bd97-fef34fd76487",
                background: "-1",
              }
            ]
          });
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white">
      <h2 className="font-bold text-xl text-neutral-800">
        Welcome to Groovebox
      </h2>

      <form className="my-8" onSubmit={handleSubmit}>
        <button
          className=" relative group/btn flex space-x-2 items-center justify-start px-4 w-full text-black rounded-md h-10 font-medium shadow-input bg-gray-50"
          type="submit"
        >
          <IconBrandGoogle className="h-4 w-4 text-neutral-800" />
          <span className="text-neutral-700 text-sm">
            Sign up with Google
          </span>
          <BottomGradient />
        </button>
        <div className="bg-gradient-to-r from-transparent via-neutral-300  to-transparent my-8 h-[1px] w-full" />
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
          <LabelInputContainer>
            <Label htmlFor="firstname">First name</Label>
            <Input id="firstname" placeholder="Tyler" type="text" />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="lastname">Last name</Label>
            <Input id="lastname" placeholder="Durden" type="text" />
          </LabelInputContainer>
        </div>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" placeholder="projectmayhem@fc.com" type="email" />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Password</Label>
          <Input id="password" placeholder="••••••••" type="password" />
        </LabelInputContainer>
        <LabelInputContainer className="mb-8">
          <Label htmlFor="confirmpassword">Confirm password</Label>
          <Input id="confirmpassword" placeholder="••••••••" type="password" />
        </LabelInputContainer>

        <button
          className="bg-gradient-to-br relative group/btn from-black to-neutral-600 block w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset]"
          type="submit"
        >
          Sign up &rarr;
          <BottomGradient />
        </button>
        <p className="text-neutral-600 text-sm max-w-sm mt-2 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[#0f0317] hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
