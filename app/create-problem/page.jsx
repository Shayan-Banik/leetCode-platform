import { currentUserRole } from '@/modules/auth/actions';
import { currentUser } from '@clerk/nextjs/server'
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import Link from 'next/link'
import React from 'react'
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import CreateProblemForm from '@/modules/problem/components/CreateProblemForm';


const CreateProblemPage = async () => {
    const user = await currentUser();
    const userRole = await currentUserRole();

    if(userRole !== UserRole.ADMIN) {
       return redirect('/')
    }

  return (
    <section className='flex flex-col min-w-screen justify-center items-center container px-8 my-8'>
        <div className='flex flex-row justify-between items-center w-full'>
            <Link href="/">
            <Button>
                <ArrowLeft size={4} />
            </Button>
            </Link>
            <h1 className='text-3xl font-bold text-amber-400'>Welcome {user?.firstName}! create a new problem</h1>
            <ModeToggle />
        </div>
        <CreateProblemForm />
    </section>
  )
}

export default CreateProblemPage;