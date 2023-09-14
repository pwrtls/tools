import React, { useState } from 'react';
import { Input, Button, Form } from 'antd';

const CommentControl: React.FC = () => {
  const [comment, setComment] = useState<string>('');

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleApply = () => {
    // Logic to apply the comment to the FetchXML
    // This can involve wrapping the comment in <!-- --> and inserting it into the XML
  };

  return (
    <div className="comment-control">
      <Form layout="vertical">
        <Form.Item label="Add Comment">
          <Input
            placeholder="Enter your comment"
            value={comment}
            onChange={handleCommentChange}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleApply}>
            Apply Comment
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CommentControl;
