    const xpTable = [0,0]

    let sum = 0;


    for (let i = 1;i <= 98;i++){
        const level = Math.floor(i + 300 * 2 ** (i / 7));
        sum += level
        xpTable.push(Math.floor(sum/4));    
    }

    export {xpTable}