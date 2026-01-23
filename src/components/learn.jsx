
import React, { useMemo, useState } from 'react';
const Learn = () => {
    const [counterOne, setCounterOne] = useState('Ayush');
    const [counterTwo, setCounterTwo] = useState(0);
    const [counterThree, setCounterThree] = useState(0);
  
    const onChange = (event) =>{
         const newVal = event.target.value;
         setCounterOne(newVal);
    }

    const IncrementOne = () => {
        setCounterTwo(counterTwo + 1)
    }
    const IncrementTwo = () => {
        setCounterThree(counterThree + 1)
    }

    const isEven = useMemo(() => {
        let i=0;
        while (i < 2000000000) i++;
        return counterTwo%2 === 0;
    }, [counterTwo])
 
     return (
        <div className="relative z-10">
            <h1>{counterOne}</h1>
         <input value={counterOne} onChange={onChange}  className="text-black" />
         <span>{isEven ? "even":"odd"}</span>
         <button onClick={IncrementOne}>increase - {counterTwo}</button>
         <button onClick={IncrementTwo}>increase - {counterThree}</button>
        </div>
     )
};

export default Learn;
