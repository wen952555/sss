import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import UserInfo from '../components/UserInfo';
import GameTable from '../components/GameTable';
import TransferModal from '../components/TransferModal';
import { 
  FiPlay, 
  FiUsers, 
  FiPlus, 
  FiRefreshCw,
  FiSearch,
  FiGrid
} from 'react-icons/fi';
import { RiCoinsLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

const Home = () => {
  const { user } = useAuth();
  const { 
    currentRoom, 
    gameState, 
    createRoom, 
    joinRoom, 
    leaveRoom, 
    startGame,
    isLoading 
  } = useGame();
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [quickJoinLoading, setQuickJoinLoading] = useState(false);
  
  // 模拟游戏数据
  const [gameData, setGameData] = useState({
    players: [
      { id: 'player1', name: user?.user_id || '玩家1', cards: ['SA', 'SK', 'SQ'] },
      { id: 'player2', name: '玩家2', cards: ['HA', 'HK', 'HQ'] },
      { id: 'player3', name: '玩家3', cards: ['DA', 'DK', 'DQ'] },
      { id: 'player4', name: '玩家4', cards: ['CA', 'CK', 'CQ'] }
    ],
    currentPlayer: 0,
    selectedCards: [],
    gameStatus: 'waiting' // waiting, playing, finished
  });
  
  const handleCreateRoom = async () => {
    const result = await createRoom(4, 10);
    if (result.success) {
      toast.success('房间创建成功！');
    }
  };
  
  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      toast.error('请输入房间号');
      return;
    }
    
    setQuickJoinLoading(true);
    const result = await joinRoom(roomCode);
    setQuickJoinLoading(false);
    
    if (result.success) {
      setShowJoinRoomModal(false);
      setRoomCode('');
    }
  };
  
  const handleQuickJoin = async () => {
    setQuickJoinLoading(true);
    // 这里可以随机加入一个房间或创建房间
    const result = await createRoom(4, 10);
    setQuickJoinLoading(false);
    
    if (result.success) {
      toast.success('快速加入成功！');
    }
  };
  
  const handleStartGame = async () => {
    if (currentRoom) {
      const result = await startGame();
      if (result.success) {
        setGameData(prev => ({ ...prev, gameStatus: 'playing' }));
      }
    } else {
      toast.error('请先创建或加入房间');
    }
  };
  
  const handleCardSelect = (playerIndex, cardIndex) => {
    if (gameData.gameStatus !== 'playing' || playerIndex !== 0) return;
    
    setGameData(prev => {
      const newSelectedCards = [...prev.selectedCards];
      const cardKey = cardIndex.toString();
      
      if (newSelectedCards.includes(cardKey)) {
        return {
          ...prev,
          selectedCards: newSelectedCards.filter(c => c !== cardKey)
        };
      } else {
        return {
          ...prev,
          selectedCards: [...newSelectedCards, cardKey]
        };
      }
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
            十三水
          </div>
          <div className="hidden md:block text-gray-400">
            经典扑克牌游戏 · 在线竞技
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {currentRoom && (
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-purple-900 px-4 py-2 rounded-full">
              <FiUsers />
              <span>房间: {currentRoom.id}</span>
            </div>
          )}
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-yellow-600 to-orange-600 px-4 py-2 rounded-full hover:opacity-90 transition"
          >
            <RiCoinsLine />
            <span>转账</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：用户信息和快速操作 */}
        <div className="space-y-6">
          <UserInfo showFullInfo={true} />
          
          {/* 快速操作面板 */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <FiGrid className="mr-2" />
              快速操作
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                disabled={isLoading || currentRoom}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <FiPlus />
                <span>创建房间</span>
              </button>
              
              <button
                onClick={() => setShowJoinRoomModal(true)}
                disabled={isLoading || currentRoom}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <FiSearch />
                <span>加入房间</span>
              </button>
              
              <button
                onClick={handleQuickJoin}
                disabled={isLoading || quickJoinLoading || currentRoom}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {quickJoinLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    匹配中...
                  </span>
                ) : (
                  <>
                    <FiPlay />
                    <span>快速开始</span>
                  </>
                )}
              </button>
              
              {currentRoom && (
                <button
                  onClick={leaveRoom}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <FiRefreshCw />
                  <span>离开房间</span>
                </button>
              )}
            </div>
          </div>
          
          {/* 游戏统计 */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4">游戏统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-400">0</div>
                <div className="text-gray-400 text-sm">胜利场次</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-400">0</div>
                <div className="text-gray-400 text-sm">总场次</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-purple-400">0%</div>
                <div className="text-gray-400 text-sm">胜率</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-yellow-400">0</div>
                <div className="text-gray-400 text-sm">连胜纪录</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 中间：游戏桌面 */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl h-full">
            {currentRoom ? (
              <div className="h-full">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">游戏房间</h2>
                    <p className="text-gray-400">房间号: {currentRoom.id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-green-900 to-green-800 px-4 py-2 rounded-full">
                      玩家: {currentRoom.players?.length || 1}/4
                    </div>
                    {gameData.gameStatus === 'waiting' && (
                      <button
                        onClick={handleStartGame}
                        disabled={isLoading || (currentRoom.players?.length || 1) < 2}
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-2 rounded-full font-bold hover:opacity-90 transition disabled:opacity-50"
                      >
                        开始游戏
                      </button>
                    )}
                  </div>
                </div>
                
                <GameTable
                  players={gameData.players}
                  currentPlayer={gameData.currentPlayer}
                  onCardSelect={handleCardSelect}
                  selectedCards={gameData.selectedCards}
                  gameStatus={gameData.gameStatus}
                  onStartGame={handleStartGame}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-6">🃏</div>
                <h2 className="text-3xl font-bold mb-4">欢迎来到十三水游戏</h2>
                <p className="text-gray-400 mb-8 max-w-md">
                  这是一款经典的扑克牌游戏，需要智慧与策略的完美结合。
                  创建房间与好友对战，或加入其他玩家的房间一决高下！
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={handleCreateRoom}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold hover:opacity-90 transition"
                  >
                    创建房间
                  </button>
                  <button
                    onClick={() => setShowJoinRoomModal(true)}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-full font-bold hover:opacity-90 transition"
                  >
                    加入房间
                  </button>
                  <button
                    onClick={handleQuickJoin}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full font-bold hover:opacity-90 transition"
                  >
                    快速开始
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 转账模态框 */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        currentUserId={user?.user_id}
        currentPoints={user?.points || 0}
      />
      
      {/* 加入房间模态框 */}
      {showJoinRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">加入房间</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">房间号</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="请输入房间号"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>💡 提示：</p>
                  <ul className="mt-2 space-y-1">
                    <li>• 房间号由房主提供</li>
                    <li>• 加入房间需要房主同意</li>
                    <li>• 每局游戏需要消耗积分</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowJoinRoomModal(false);
                    setRoomCode('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={quickJoinLoading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {quickJoinLoading ? '加入中...' : '确认加入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;