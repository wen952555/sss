import { useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [amount, setAmount] = useState(0);

  const handleSearch = async () => {
    const res = await axios.get(`/api/search.php?phone=${searchPhone}`);
    setFoundUser(res.data);
  };

  const handleTransfer = async () => {
    await axios.post('/api/transfer.php', { to_id: foundUser.short_id, amount });
    alert("赠送成功");
  };

  return (
    <div className="p-4">
      <input placeholder="搜索手机号" onChange={e => setSearchPhone(e.target.value)} />
      <button onClick={handleSearch}>搜索</button>
      
      {foundUser && (
        <div className="mt-4 border p-2">
          <p>用户ID: {foundUser.short_id}</p>
          <input type="number" placeholder="积分数量" onChange={e => setAmount(e.target.value)} />
          <button onClick={handleTransfer}>赠送积分</button>
        </div>
      )}
    </div>
  );
}