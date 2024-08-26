import { useCallback } from 'react';
import { message } from 'antd';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

export const useComponentOperations = (
    post: any,
    components: ISolutionComponentSummary[],
    selectedRowKeys: string[],
    setProgress: (progress: number) => void,
    setOperationDebugInfo: React.Dispatch<React.SetStateAction<string[]>>,
    setCopying: (copying: boolean) => void  // Add this parameter
) => {
    const copyToComponents = useCallback(async (solutionName: string) => {
        if (!post) {
            message.error('Copy function is not available');
            setCopying(false);  // Set copying to false if post is not available
            return;
        }

        setProgress(0);
        setOperationDebugInfo(['Starting copy process']);

        const totalComponents = selectedRowKeys.length;
        let copiedComponents = 0;

        try {
            for (const componentKey of selectedRowKeys) {
                const component = components.find(comp => comp.msdyn_objectid === componentKey);
                if (component) {
                    try {
                        await post('api/data/v9.2/AddSolutionComponent', {
                            "ComponentId": componentKey,
                            "ComponentType": component.msdyn_componenttype.toString(),
                            "SolutionUniqueName": solutionName,
                            "AddRequiredComponents": 'false'
                        });

                        copiedComponents++;
                        const newProgress = Math.round((copiedComponents / totalComponents) * 100);
                        setProgress(newProgress);
                        // eslint-disable-next-line no-loop-func
                        setOperationDebugInfo(prev => [...prev, `Copied component ${copiedComponents}/${totalComponents}`]);
                        
                        await new Promise(resolve => setTimeout(resolve, 10));
                    } catch (error) {
                        // eslint-disable-next-line no-loop-func
                        setOperationDebugInfo(prev => [...prev, `Failed to copy component: ${componentKey}`]);
                    }
                }
            }

            message.success('Components copied successfully');
        } catch (error) {
            console.error('Error during copy process:', error);
            message.error('An error occurred during the copy process');
        } finally {
            setCopying(false);  // Set copying to false when the process is complete
        }
    }, [post, components, selectedRowKeys, setProgress, setOperationDebugInfo, setCopying]);

    const deleteComponents = useCallback(async () => {
        if (!post) {
            message.error('Delete function is not available');
            return;
        }

        setProgress(0);
        setOperationDebugInfo(['Starting delete process']);

        const totalComponents = selectedRowKeys.length;
        let deletedComponents = 0;

        for (const componentKey of selectedRowKeys) {
            const component = components.find(comp => comp.msdyn_objectid === componentKey);
            if (component) {
                try {
                    await post('api/data/v9.2/RemoveSolutionComponent', {
                        "ComponentId": componentKey,
                        "ComponentType": component.msdyn_componenttype.toString(),
                        "SolutionUniqueName": component.msdyn_solutionid
                    });

                    deletedComponents++;
                    const newProgress = Math.round((deletedComponents / totalComponents) * 100);
                    setProgress(newProgress);
                    // eslint-disable-next-line no-loop-func
                    setOperationDebugInfo(prev => [...prev, `Deleted component ${deletedComponents}/${totalComponents}`]);
                    
                    await new Promise(resolve => setTimeout(resolve, 10));
                } catch (error) {
                    // eslint-disable-next-line no-loop-func
                    setOperationDebugInfo(prev => [...prev, `Failed to delete component: ${componentKey}`]);
                }
            }
        }

        message.success('Components deleted successfully');
    }, [post, components, selectedRowKeys, setProgress, setOperationDebugInfo]);

    return { copyToComponents, deleteComponents };
};