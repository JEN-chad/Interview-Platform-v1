
import Agents from '@/components/Agents';
import React from 'react'

export const Page = () => {
  return (
   <>
     <h3> Interview Generation Page</h3>
     <Agents userName="Jenish" userId="user1" type="generate" />
   </>
  )
}

export default Page;
