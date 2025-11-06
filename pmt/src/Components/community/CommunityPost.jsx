import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  TextField,
  Divider,
  IconButton,
  Grid,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip,
  CardActions
} from '@mui/material';
import {
  ThumbUp,
  Comment,
  Reply,
  AttachFile,
  MoreVert,
  Send,
  Bookmark,
  BookmarkBorder,
  Flag,
  Delete,
  Edit
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const CommunityPost = ({ 
  post, 
  currentUser, 
  onLike, 
  onComment, 
  onShare, 
  onDelete,
  onSavePost,
  onReport 
}) => {
  const [comment, setComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [saved, setSaved] = useState(post?.saved || false);

  // Handle menu open/close
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle comment submission
  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (comment.trim() && onComment && post?.id) {
      try {
        onComment(post.id, comment);
        setComment('');
      } catch (error) {
        console.error("Error submitting comment:", error);
        // Could add error state and display to user
      }
    }
  };

  // Handle bookmarking/saving post
  const handleSavePost = () => {
    if (onSavePost && post?.id) {
      try {
        setSaved(!saved);
        onSavePost(post.id, !saved);
      } catch (error) {
        console.error("Error saving post:", error);
        // Revert state if operation failed
        setSaved(saved);
      }
    }
    handleMenuClose();
  };

  // Handle post reporting
  const handleReportPost = () => {
    if (onReport && post?.id) {
      try {
        onReport(post.id);
      } catch (error) {
        console.error("Error reporting post:", error);
      }
    }
    handleMenuClose();
  };

  // Handle post deletion with confirmation
  const handleDeletePost = () => {
    if (onDelete && post?.id) {
      if (window.confirm("Are you sure you want to delete this post?")) {
        try {
          onDelete(post.id);
        } catch (error) {
          console.error("Error deleting post:", error);
        }
      }
    }
    handleMenuClose();
  };

  // Check if current user is post author
  const isAuthor = currentUser?.id === post?.author?.id;

  // Safely get post date for formatting
  const getPostDate = () => {
    try {
      return formatDistanceToNow(new Date(post?.created_at || Date.now()), { addSuffix: true });
    } catch (error) {
      return "some time ago";
    }
  };

  if (!post) {
    return null; // Don't render if post data is missing
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <CardContent>
          {/* Post Header with Author Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                src={post.author?.profileImage}
                alt={post.author?.name || 'User'}
                sx={{ mr: 2 }}
              >
                {post.author?.name?.[0] || 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">
                  {post.author?.name || 'Unknown User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getPostDate()}
                </Typography>
              </Box>
            </Box>

            {/* Post Menu */}
            <IconButton 
              onClick={handleMenuClick} 
              size="small"
              aria-label="post options"
            >
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleSavePost}>
                {saved ? (
                  <>
                    <Bookmark fontSize="small" sx={{ mr: 1 }} />
                    Unsave Post
                  </>
                ) : (
                  <>
                    <BookmarkBorder fontSize="small" sx={{ mr: 1 }} />
                    Save Post
                  </>
                )}
              </MenuItem>
              
              {isAuthor ? (
                [
                  <MenuItem key="edit" onClick={handleMenuClose}>
                    <Edit fontSize="small" sx={{ mr: 1 }} />
                    Edit Post
                  </MenuItem>,
                  <MenuItem key="delete" onClick={handleDeletePost}>
                    <Delete fontSize="small" sx={{ mr: 1 }} color="error" />
                    Delete Post
                  </MenuItem>
                ]
              ) : (
                <MenuItem onClick={handleReportPost}>
                  <Flag fontSize="small" sx={{ mr: 1 }} color="warning" />
                  Report Post
                </MenuItem>
              )}
            </Menu>
          </Box>
          
          {/* Post Content */}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {post.content || post.message || ''}
          </Typography>
          
          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1}>
                {post.attachments.map((file, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={file.filename || file || 'File'}
                      component={file.url ? "a" : "div"}
                      href={file.url || undefined}
                      clickable={Boolean(file.url)}
                      size="small"
                      icon={<AttachFile />}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
        
        {/* Post Stats */}
        <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {(post.likes > 0) && `${post.likes} likes`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {(post.comments?.length > 0) && `${post.comments.length} comments`}
          </Typography>
        </Box>
        
        {/* Post Actions */}
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Button
            startIcon={<ThumbUp color={post.liked ? "primary" : "inherit"} />}
            onClick={() => onLike && post.id && onLike(post.id)}
            color={post.liked ? "primary" : "inherit"}
            size="small"
          >
            Like
          </Button>
          <Button
            startIcon={<Comment />}
            onClick={() => {
              const input = document.getElementById(`comment-input-${post.id}`);
              if (input) input.focus();
            }}
            size="small"
          >
            Comment
          </Button>
          <Button
            startIcon={<Reply />}
            onClick={() => onShare && post.id && onShare(post.id)}
            size="small"
          >
            Share
          </Button>
        </CardActions>
        
        {/* Comments Section */}
        {post.comments && post.comments.length > 0 && (
          <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
            <Divider sx={{ my: 1 }} />
            
            {/* Show all or just first 2 comments */}
            {(showAllComments ? post.comments : post.comments.slice(0, 2)).map((comment, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                <Avatar
                  src={comment.author?.profileImage}
                  sx={{ width: 32, height: 32, mr: 1 }}
                >
                  {comment.author?.name?.[0] || 'U'}
                </Avatar>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  p: 1, 
                  flexGrow: 1,
                  bgcolor: 'background.paper'
                }}>
                  <Typography variant="subtitle2">
                    {comment.author?.name || 'Unknown User'}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {comment.created_at ? 
                        formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 
                        'recently'}
                    </Typography>
                  </Typography>
                  <Typography variant="body2">
                    {comment.content || ''}
                  </Typography>
                </Card>
              </Box>
            ))}
            
            {/* Show more/less comments button */}
            {post.comments.length > 2 && (
              <Button 
                size="small" 
                sx={{ ml: 5, mb: 1 }}
                onClick={() => setShowAllComments(!showAllComments)}
              >
                {showAllComments 
                  ? "Show less comments" 
                  : `View all ${post.comments.length} comments`}
              </Button>
            )}
          </Box>
        )}
        
        {/* Add comment input */}
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <form onSubmit={handleSubmitComment}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar
                sx={{ width: 32, height: 32, mr: 1 }}
                src={currentUser?.profileImage}
              >
                {currentUser?.name?.[0] || 'U'}
              </Avatar>
              <TextField
                id={`comment-input-${post.id}`}
                variant="outlined"
                placeholder="Add a comment..."
                size="small"
                fullWidth
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Send comment">
                        <span> {/* Wrap in span to allow for disabled state with tooltip */}
                          <IconButton 
                            size="small" 
                            color="primary" 
                            type="submit"
                            disabled={!comment.trim()}
                            aria-label="Send comment"
                          >
                            <Send />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </form>
        </Box>
      </Card>
    </motion.div>
  );
};

// Add PropTypes for validation
CommunityPost.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string,
    message: PropTypes.string,
    author: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      profileImage: PropTypes.string
    }),
    created_at: PropTypes.string,
    likes: PropTypes.number,
    liked: PropTypes.bool,
    saved: PropTypes.bool,
    comments: PropTypes.array,
    attachments: PropTypes.array
  }).isRequired,
  currentUser: PropTypes.object,
  onLike: PropTypes.func,
  onComment: PropTypes.func,
  onShare: PropTypes.func,
  onDelete: PropTypes.func,
  onSavePost: PropTypes.func,
  onReport: PropTypes.func
};

// Add default props
CommunityPost.defaultProps = {
  currentUser: {},
  onLike: () => {},
  onComment: () => {},
  onShare: () => {},
  onDelete: () => {},
  onSavePost: () => {},
  onReport: () => {}
};

export default CommunityPost;
