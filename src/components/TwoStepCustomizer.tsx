import { useState } from 'react'
import CustomizerStep1 from './CustomizerStep1'
import CustomizerStep2 from './CustomizerStep2'
import { usePricingStore } from '@/lib/store'

const TwoStepCustomizer = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [designData, setDesignData] = useState<{
    selectedProduct: string
    selectedColors: string[]
  }>({
    selectedProduct: '',
    selectedColors: []
  })

  const { prints } = usePricingStore()

  const handleStep1Next = () => {
    // Get current state from pricing store and local state
    const product = designData.selectedProduct
    const colors = designData.selectedColors
    
    // Validate required fields
    if (!product || colors.length === 0 || prints.length === 0) {
      return // Step1 component handles validation UI
    }

    setCurrentStep(2)
  }

  const handleStep2Back = () => {
    setCurrentStep(1)
  }

  // Pass design data between steps
  const updateDesignData = (data: Partial<typeof designData>) => {
    setDesignData(prev => ({ ...prev, ...data }))
  }

  return (
    <div className="min-h-screen bg-background">
      {currentStep === 1 ? (
        <CustomizerStep1 
          onNext={handleStep1Next}
          onDataChange={updateDesignData}
          designData={designData}
        />
      ) : (
        <CustomizerStep2 
          onBack={handleStep2Back}
          selectedProduct={designData.selectedProduct}
          selectedColors={designData.selectedColors}
        />
      )}
    </div>
  )
}

export default TwoStepCustomizer
