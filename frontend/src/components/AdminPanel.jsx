import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  FiUsers, 
  FiSearch, 
  FiTrash2, 
  FiEdit, 
  FiChevronLeft, 
  FiChevronRight,
  FiRefreshCw 
} from 'react-icons/fi';
import { RiCoinsLine } from 'react-icons/ri';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustPointsModal, setAdjustPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [adjustType, setAdjustType] = useState('set');
  
  const fetchUsers = async (page = 1) => {
    if (!user?.is_admin) return;
    
    setLoading(true);
    try {
      const response = await adminAPI.getAllUsers(page, pagination.limit);
      if (response.success) {
        setUsers(response.users || []);
        setPagination(response.pagination || pagination);
      } else {
        toast.error(response.error || '获取用户列表失败');
      }
    } catch (error) {
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const handleDeleteUser = async (userId) => {
    if (!confirm(`确定要删除用户 ${userId} 吗？此操作不可恢复。`)) return;
    
    try {
      const response = await adminAPI.deleteUser(userId);
      if (response.success) {
        toast.success('用户删除成功');
        fetchUsers(pagination.page);
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };
  
  const handleAdjustPoints = async () => {
    if (!selectedUser || !pointsAmount || isNaN(pointsAmount)) {
      toast.error('请输入有效的积分数量');
      return;
    }
    
    try {
      const response = await adminAPI.adjustPoints(
        selectedUser.user_id, 
        parseInt(pointsAmount), 
        adjustType
      );
      
      if (response.success) {
        toast.success('积分调整成功');
        setAdjustPointsModal(false);
        setPointsAmount('');
        fetchUsers(pagination.page);
      } else {
        toast.error(response.error || '调整失败');
      }
    } catch (error) {
      toast.error('调整失败');
    }
  };
  
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      fetchUsers(1);
      return;
    }
    
    const filtered = users.filter(user => 
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery)
    );
    
    setUsers(filtered);
  };
  
  const renderUserRow = (user) => (
    <tr key={user.user_id} className="hover:bg-gray-800 transition">
      <td className="p-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold">
            {user.user_id.charAt(0)}
          </div>
          <div>
            <div className="font-bold">{user.user_id}</div>
            <div className="text-gray-400 text-xs">{user.phone}</div>
          </div>
        </div>
      </td>
      <td className="p-3">
        <div className="flex items-center space-x-1">
          <RiCoinsLine className="text-yellow-400" />
          <span className="font-bold">{user.points}</span>
        </div>
      </td>
      <td className="p-3">
        <div className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_admin ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>
          {user.is_admin ? '管理员' : '普通用户'}
        </div>
      </td>
      <td className="p-3 text-gray-400 text-sm">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="p-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedUser(user);
              setAdjustPointsModal(true);
            }}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            title="调整积分"
          >
            <FiEdit />
          </button>
          <button
            onClick={() => handleDeleteUser(user.user_id)}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            title="删除用户"
          >
            <FiTrash2 />
          </button>
        </div>
      </td>
    </tr>
  );
  
  if (!user?.is_admin) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold mb-2">权限不足</h2>
        <p className="text-gray-400">您没有管理员权限，无法访问此页面。</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-700 to-pink-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FiUsers className="text-3xl text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">用户管理</h2>
              <p className="text-purple-200">管理用户账户和积分</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-black bg-opacity-30 px-4 py-2 rounded-full">
              共 <span className="font-bold">{pagination.total}</span> 用户
            </div>
            <button
              onClick={() => fetchUsers(pagination.page)}
              disabled={loading}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      
      {/* 搜索栏 */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索用户ID或手机号..."
                className="w-full bg-gray-700 text-white px-4 py-3 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition"
          >
            搜索
          </button>
        </div>
      </div>
      
      {/* 用户表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-3 text-left text-gray-400 font-bold">用户信息</th>
              <th className="p-3 text-left text-gray-400 font-bold">积分</th>
              <th className="p-3 text-left text-gray-400 font-bold">角色</th>
              <th className="p-3 text-left text-gray-400 font-bold">注册时间</th>
              <th className="p-3 text-left text-gray-400 font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">
                  暂无用户数据
                </td>
              </tr>
            ) : (
              users.map(renderUserRow)
            )}
          </tbody>
        </table>
      </div>
      
      {/* 分页 */}
      {pagination.pages > 1 && (
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-gray-400">
            第 {pagination.page} 页，共 {pagination.pages} 页
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft />
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchUsers(pageNum)}
                  className={`
                    w-10 h-10 rounded-lg font-bold transition
                    ${pagination.page === pageNum
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
      
      {/* 调整积分模态框 */}
      {adjustPointsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">调整积分</h3>
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm">用户</div>
                  <div className="font-bold text-lg">{selectedUser.user_id}</div>
                  <div className="text-gray-400 text-sm">{selectedUser.phone}</div>
                  <div className="mt-2 flex items-center space-x-2">
                    <RiCoinsLine className="text-yellow-400" />
                    <span>当前积分: {selectedUser.points}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">调整方式</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { value: 'set', label: '设为' },
                      { value: 'add', label: '增加' },
                      { value: 'subtract', label: '减少' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAdjustType(option.value)}
                        className={`
                          py-2 rounded-lg transition font-bold
                          ${adjustType === option.value
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">积分数量</label>
                  <input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                    placeholder="输入积分数量"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-gray-400 text-sm">调整结果</div>
                  <div className="font-bold text-lg">
                    {pointsAmount && !isNaN(pointsAmount) ? (
                      <>
                        {adjustType === 'set' && `设为: ${parseInt(pointsAmount)}`}
                        {adjustType === 'add' && `增加至: ${selectedUser.points + parseInt(pointsAmount)}`}
                        {adjustType === 'subtract' && `减少至: ${Math.max(0, selectedUser.points - parseInt(pointsAmount))}`}
                      </>
                    ) : '请输入有效数字'}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setAdjustPointsModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleAdjustPoints}
                  disabled={!pointsAmount || isNaN(pointsAmount)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  确认调整
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;