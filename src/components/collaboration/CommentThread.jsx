import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Check, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function CommentThread({ targetType, targetId, autoRefresh = true }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
        loadComments();
        
        let interval;
        if (autoRefresh) {
            interval = setInterval(loadComments, 5000); // Poll every 5s
        }
        return () => clearInterval(interval);
    }, [targetType, targetId, autoRefresh]);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadComments = async () => {
        try {
            const fetchedComments = await base44.entities.Comment.filter({
                target_type: targetType,
                target_id: targetId
            }, '-created_date');
            setComments(fetchedComments);
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim() || !user) return;

        setIsLoading(true);
        try {
            await base44.entities.Comment.create({
                target_type: targetType,
                target_id: targetId,
                content: newComment,
                author_name: user.full_name || user.email,
                author_email: user.email
            });
            
            setNewComment('');
            await loadComments();
            toast.success('Comment added');
        } catch (error) {
            console.error('Failed to add comment:', error);
            toast.error('Failed to add comment');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleResolved = async (commentId, currentStatus) => {
        try {
            await base44.entities.Comment.update(commentId, {
                is_resolved: !currentStatus
            });
            await loadComments();
            toast.success(currentStatus ? 'Reopened' : 'Marked as resolved');
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-green-400">
                    Comments ({comments.length})
                </h3>
            </div>

            {/* Comment List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.map((comment) => (
                    <div
                        key={comment.id}
                        className={`p-4 rounded-lg border ${
                            comment.is_resolved
                                ? 'bg-slate-800/50 border-slate-700'
                                : 'bg-slate-800 border-slate-600'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-green-400">
                                    {comment.author_name}
                                </span>
                                {comment.is_resolved && (
                                    <Badge className="bg-green-900/30 text-green-400 text-xs">
                                        Resolved
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-500">
                                    {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                        
                        <p className="text-sm text-slate-300 mb-2 whitespace-pre-wrap">
                            {comment.content}
                        </p>

                        {user && (user.email === comment.author_email || user.role === 'admin') && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleResolved(comment.id, comment.is_resolved)}
                                className="h-7 text-xs"
                            >
                                <Check className="w-3 h-3 mr-1" />
                                {comment.is_resolved ? 'Reopen' : 'Resolve'}
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {/* New Comment Input */}
            <div className="space-y-2">
                <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-20 bg-slate-800 border-slate-600 text-green-300"
                    disabled={isLoading}
                />
                <Button
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || isLoading}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <Send className="w-4 h-4 mr-2" />
                    Add Comment
                </Button>
            </div>
        </div>
    );
}