import { useInView } from 'react-intersection-observer';

function AuditRecordView() {
  // ... existing code ...

  const { ref, inView } = useInView({
    threshold: 0.5,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ... existing code ...

  return (
    <div>
      {/* ... existing code ... */}
      {auditRecords.map((record) => (
        // ... existing code ...
      ))}
      <div ref={ref} style={{ height: '20px' }} />
      {/* ... existing code ... */}
    </div>
  );
}