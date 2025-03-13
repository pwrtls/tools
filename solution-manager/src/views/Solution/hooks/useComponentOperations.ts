import { useCallback } from 'react';
import { message } from 'antd';
import { ISolutionComponentSummary } from 'models/solutionComponentSummary';

interface FailedComponent {
    name: string;
    error: string;
}

export const useComponentOperations = (
    post: any,
    components: ISolutionComponentSummary[],
    selectedRowKeys: string[],
    setProgress: (progress: number) => void,
    setOperationDebugInfo: React.Dispatch<React.SetStateAction<string[]>>,
    setCopying: (copying: boolean) => void
) => {
    const copyToComponents = useCallback(async (solutionName: string) => {
        if (!post) {
            message.error('Copy function is not available');
            setCopying(false);
            return;
        }

        setProgress(0);
        setOperationDebugInfo(['Starting copy process...']);
        const totalComponents = selectedRowKeys.length;
        let copiedComponents = 0;
        let failedComponents = 0;
        const failedComponentsList: FailedComponent[] = [];

        try {
            for (const componentKey of selectedRowKeys) {
                const component = components.find(comp => comp.msdyn_objectid === componentKey);
                if (component) {
                    try {
                        console.log('Copying component:', {
                            componentKey,
                            componentType: component.msdyn_componenttype,
                            solutionName,
                            componentName: component.msdyn_name
                        });

                        const requestBody = {
                            "ComponentId": componentKey,
                            "ComponentType": component.msdyn_componenttype,
                            "SolutionUniqueName": solutionName,
                            "AddRequiredComponents": 'false'
                        };

                        console.log('Request body:', JSON.stringify(requestBody, null, 2));

                        // Ensure headers are properly formatted for the proxy
                        const headers = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Prefer': 'return=representation'
                        };

                        console.log('Request headers:', JSON.stringify(headers, null, 2));

                        // Send the request with properly formatted headers
                        const response = await post('api/data/v9.2/AddSolutionComponent', JSON.stringify(requestBody), headers);

                        console.log('API Response:', response);

                        // Check if the response is valid - both 200 and 204 indicate success
                        if (response && (response.statusCode === 200 || response.statusCode === 204)) {
                            copiedComponents++;
                            const newProgress = Math.round((copiedComponents / totalComponents) * 100);
                            setProgress(newProgress);
                            console.log(`✅ Successfully copied component ${component.msdyn_name} (${copiedComponents}/${totalComponents})`);
                            setOperationDebugInfo(prev => [...prev, `✅ Successfully copied: ${component.msdyn_name}`]);
                        } else {
                            failedComponents++;
                            let errorMessage = 'Unknown error';
                            try {
                                const errorContent = response?.content ? JSON.parse(response.content) : null;
                                errorMessage = errorContent?.error?.message || 'Invalid response';
                                console.error('Error content:', errorContent);
                            } catch (parseError) {
                                console.error('Failed to parse error response:', parseError);
                            }
                            
                            failedComponentsList.push({
                                name: component.msdyn_name,
                                error: errorMessage
                            });
                            
                            console.error('Failed response:', response);
                            console.error(`❌ Failed to copy component ${component.msdyn_name}: ${errorMessage}`);
                            setOperationDebugInfo(prev => [...prev, `❌ Failed to copy: ${component.msdyn_name}`]);
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 10));
                    } catch (error: any) {
                        failedComponents++;
                        const errorMessage = error.message || 'Unknown error';
                        failedComponentsList.push({
                            name: component.msdyn_name,
                            error: errorMessage
                        });
                        console.error(`Failed to copy component ${component.msdyn_name}:`, error);
                        setOperationDebugInfo(prev => [...prev, `❌ Failed to copy: ${component.msdyn_name}`]);
                    }
                }
            }

            // Add summary to the modal
            if (failedComponents === 0) {
                setOperationDebugInfo(prev => [...prev, '', `✅ Operation completed successfully! Copied ${copiedComponents} components.`]);
            } else {
                const failedList = failedComponentsList.map(fc => `- ${fc.name}: ${fc.error}`).join('\n');
                setOperationDebugInfo(prev => [
                    ...prev,
                    '',
                    `⚠️ Operation completed with ${failedComponents} failures:`,
                    ...failedList.split('\n'),
                    '',
                    `Total: ${copiedComponents} copied, ${failedComponents} failed`
                ]);
            }
        } catch (error) {
            console.error('Error during copy process:', error);
            setOperationDebugInfo(prev => [...prev, '', '❌ Operation failed with an unexpected error']);
        }
    }, [post, components, selectedRowKeys, setProgress, setOperationDebugInfo, setCopying]);

    const deleteComponents = useCallback(async () => {
        if (!post) {
            message.error('Delete function is not available');
            return;
        }

        setProgress(0);
        setOperationDebugInfo(['Starting delete process...']);
        const totalComponents = selectedRowKeys.length;
        let deletedComponents = 0;
        const failedComponentsList: FailedComponent[] = [];

        for (const componentKey of selectedRowKeys) {
            const component = components.find(comp => comp.msdyn_objectid === componentKey);
            if (component) {
                try {
                    const requestBody = {
                        "ComponentId": componentKey,
                        "ComponentType": component.msdyn_componenttype.toString(),
                        "SolutionUniqueName": component.msdyn_solutionid
                    };

                    console.log('Delete request body:', JSON.stringify(requestBody, null, 2));

                    // Ensure headers are properly formatted for the proxy
                    const headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Prefer': 'return=representation'
                    };

                    console.log('Delete request headers:', JSON.stringify(headers, null, 2));

                    // Send the request with properly formatted headers
                    await post('api/data/v9.2/RemoveSolutionComponent', JSON.stringify(requestBody), headers);

                    deletedComponents++;
                    const newProgress = Math.round((deletedComponents / totalComponents) * 100);
                    setProgress(newProgress);
                    console.log(`Deleted component ${deletedComponents}/${totalComponents}`);
                    setOperationDebugInfo(prev => [...prev, `✅ Successfully deleted: ${component.msdyn_name || componentKey}`]);
                    
                    await new Promise(resolve => setTimeout(resolve, 10));
                } catch (error: any) {
                    failedComponentsList.push({
                        name: component.msdyn_name || componentKey,
                        error: error.message || 'Unknown error'
                    });
                    console.error(`Failed to delete component: ${componentKey}`, error);
                    setOperationDebugInfo(prev => [...prev, `❌ Failed to delete: ${component.msdyn_name || componentKey}`]);
                }
            }
        }

        // Add summary to the modal
        if (failedComponentsList.length === 0) {
            setOperationDebugInfo(prev => [...prev, '', `✅ Operation completed successfully! Deleted ${deletedComponents} components.`]);
        } else {
            const failedList = failedComponentsList.map(fc => `- ${fc.name}: ${fc.error}`).join('\n');
            setOperationDebugInfo(prev => [
                ...prev,
                '',
                `⚠️ Operation completed with ${failedComponentsList.length} failures:`,
                ...failedList.split('\n'),
                '',
                `Total: ${deletedComponents} deleted, ${failedComponentsList.length} failed`
            ]);
        }
    }, [post, components, selectedRowKeys, setProgress, setOperationDebugInfo]);

    return { copyToComponents, deleteComponents };
};